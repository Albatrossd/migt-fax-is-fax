import { NextResponse } from 'next/server';
import { LlamaCloud } from '@llamaindex/llama-cloud';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const client = new LlamaCloud({
      apiKey: process.env.LLAMA_CLOUD_API_KEY,
    });

    // 1. Kick off the parse
    const result = await client.parsing.parse({
      upload_file: file,
      tier: "cost_effective",
      version: "latest",
      expand: ["items"],
    });

    const jobId = result.job.id;
    let textResult: any;
    let status = "PENDING";
    let attempts = 0;

    // 2. Polling Loop
    while (status !== "COMPLETED" && status !== "SUCCESS" && attempts < 20) {
      console.log(`Checking status... Attempt ${attempts + 1}`);
      
textResult = await client.parsing.get(jobId, {
    expand: ["items"], // CORRECT: ID first, then options object
});

      status = textResult.job.status;

      if (status === "FAILED") {
        throw new Error(`LlamaParse failed: ${textResult.job.error_message}`);
      }

      if (status !== "COMPLETED" && status !== "SUCCESS") {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }
    }

// Look inside the first page for the items array
const items = textResult.pages?.[0]?.items || [];

const textContent = items
    .map((item: any) => item.text || item.md || "")
    .join('\n');

return NextResponse.json({ 
    text: textContent || "No text extracted",
    raw: textResult 
}, { status: 200 });
    } catch (error: any) {  
        console.error("Error processing file:", error);
        return NextResponse.json({ error: error.message || "An error occurred" }, { status: 500 });
    }
}