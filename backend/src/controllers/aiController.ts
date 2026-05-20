import { type Request, type Response } from 'express';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';
import pool from '../db/index';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function checkAdminKey(req: Request, res: Response): boolean {
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function chunkText(text: string, size = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });
  return response.data.map(d => d.embedding);
}

/**
 * POST /api/ai/upload
 * Admin-only: parse a PDF, chunk it, embed, and store in ai_documents + ai_chunks.
 */
export const uploadDocument = async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const parsed = await pdfParse(req.file.buffer);
    const title = req.body.title || req.file.originalname.replace(/\.pdf$/i, '');
    const chunks = chunkText(parsed.text);

    const docResult = await pool.query(
      'INSERT INTO ai_documents (filename, title) VALUES ($1, $2) RETURNING id',
      [req.file.originalname, title]
    );
    const documentId: number = docResult.rows[0].id;

    const embeddings = await embedTexts(chunks);

    // Batch insert all chunks
    const chunkValues = chunks.map((content, i) => ({
      documentId,
      content,
      embedding: embeddings[i],
      chunkIndex: i,
    }));

    for (const chunk of chunkValues) {
      await pool.query(
        'INSERT INTO ai_chunks (document_id, content, embedding, chunk_index) VALUES ($1, $2, $3::vector, $4)',
        [chunk.documentId, chunk.content, JSON.stringify(chunk.embedding), chunk.chunkIndex]
      );
    }

    res.status(201).json({ documentId, chunksCreated: chunks.length });
  } catch (err) {
    console.error('Error uploading document:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ai/chat
 * Embed question, retrieve top-5 chunks via cosine similarity, call GPT-4o.
 */
export const chat = async (req: Request, res: Response) => {
  const { question } = req.body as { question?: string };

  if (!question || typeof question !== 'string' || question.trim() === '') {
    res.status(400).json({ error: 'Missing required field: question' });
    return;
  }

  try {
    const [questionEmbedding] = await embedTexts([question.trim()]);

    const chunkResult = await pool.query<{ content: string; document_id: number }>(
      `SELECT content, document_id
       FROM ai_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [JSON.stringify(questionEmbedding)]
    );

    const hasChunks = chunkResult.rows.length > 0;

    let userMessage: string;
    let sources: string[];

    if (hasChunks) {
      const docIds = [...new Set(chunkResult.rows.map(r => r.document_id))];
      const docResult = await pool.query<{ id: number; title: string }>(
        `SELECT id, title FROM ai_documents WHERE id = ANY($1)`,
        [docIds]
      );
      const titleMap = new Map(docResult.rows.map(r => [r.id, r.title]));

      const contextBlocks = chunkResult.rows
        .map((r, i) => `[${i + 1}] ${r.content}`)
        .join('\n\n');

      sources = [...new Set(chunkResult.rows.map(r => titleMap.get(r.document_id) ?? 'Unknown'))];
      userMessage = `Context:\n${contextBlocks}\n\nQuestion: ${question.trim()}`;
    } else {
      sources = [];
      userMessage = question.trim();
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert drum technique coach built into Groove Vault. When context from drum lesson materials is provided, prioritize and ground your answer in that content and cite it. When no context is provided or the context doesn\'t cover the question, answer from your general drum knowledge — be specific, practical, and concise. Never refuse to answer a drum-related question.',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? '';
    res.json({ answer, sources });
  } catch (err) {
    console.error('Error in chat:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/ai/documents
 * Admin-only: list all uploaded documents.
 */
export const listDocuments = async (req: Request, res: Response) => {
  if (!checkAdminKey(req, res)) return;

  try {
    const result = await pool.query(
      'SELECT * FROM ai_documents ORDER BY uploaded_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing documents:', err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: 'Internal server error' });
  }
};
