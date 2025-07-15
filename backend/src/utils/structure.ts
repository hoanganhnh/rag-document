import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { ChatOpenAI } from '@langchain/openai';

const llm = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: 'gpt-3.5-turbo',
  temperature: 0,
});

const STRUCTURE_PROMPT = PromptTemplate.fromTemplate(`
    You are given a raw document content. Extract and return JSON with this schema:
    {{
      "title": string,
      "summary": string,
      "keywords": string[],
      "sections": [[{{heading}}: string, {{content}}: string]]
    }}
    
    Raw document:
    """
    {document}
    """
`);

export interface StructuredDocument {
  title: string;
  summary: string;
  keywords: string[];
  sections: Array<{ heading: string; content: string }>;
}

export async function structureText(raw: string): Promise<StructuredDocument> {
  const chain = RunnableSequence.from([STRUCTURE_PROMPT, llm]);

  const resp = await chain.invoke({ document: raw });

  return JSON.parse(resp.text) as StructuredDocument;
}
