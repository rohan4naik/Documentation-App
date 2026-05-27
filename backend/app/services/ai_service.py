import google.generativeai as genai
from app.config import settings
import json
import asyncio

class AIService:
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    async def analyze_document(self, content: str) -> dict:
        prompt = f"""
        Analyze the following document and output a JSON object with keys:
        - "summary": A brief 2-3 sentence summary/excerpt.
        - "category": One relevant category (e.g. Engineering, Product, Marketing, Legal, Finance).
        - "tags": An array of 3-4 lowercase keyword tags.
        
        Document content:
        {content}
        """
        for attempt in range(4):
            try:
                response = self.model.generate_content(prompt)
                # Parse response text to JSON and return metadata
                cleaned_text = response.text.strip('` \n').replace('json', '')
                return json.loads(cleaned_text)
            except Exception as e:
                # If rate-limited (429), wait and retry
                if ("429" in str(e) or "ResourceExhausted" in type(e).__name__ or "ResourceExhausted" in str(e)) and attempt < 3:
                    await asyncio.sleep(3 + attempt * 3) # Wait 3s, 6s, 9s
                    continue
                import traceback
                traceback.print_exc()
                return {
                    "summary": f"AI summary failed to generate. Error: {str(e)}",
                    "category": "Uncategorized",
                    "tags": ["uploaded"]
                }

    async def ask_question(self, question: str, history: list, document_contexts: list) -> str:
        # Construct the context block from documents
        context = ""
        if document_contexts:
            context = "\n\n".join([
                f"Document Title: {doc['title']}\nContent: {doc['content']}"
                for doc in document_contexts
            ])
        
        prompt = f"""
        You are a strict documentation assistant. You ONLY answer questions based on the documents uploaded in the current workspace. You must NEVER use general knowledge, external information, or make assumptions beyond what is explicitly stated in the documents.

        RULES:
        1. ONLY answer using information found in the documents below.
        2. If the answer is NOT in the documents, respond with: "I apologize, but the provided documents do not contain information about that topic. Please upload relevant documents or ask a question related to the existing documents."
        3. Do NOT add any extra information from general knowledge. Do NOT say "However..." or "Based on general knowledge...".
        4. Keep your answers concise and directly reference the documents.
        
        Available documents in this workspace:
        {context if context else "[No documents uploaded in this workspace yet]"}
        
        Chat History:
        {history}
        
        User Question: {question}
        """
        
        for attempt in range(4):
            try:
                response = self.model.generate_content(prompt)
                return response.text
            except Exception as e:
                # If rate-limited (429), wait and retry
                if ("429" in str(e) or "ResourceExhausted" in type(e).__name__ or "ResourceExhausted" in str(e)) and attempt < 3:
                    await asyncio.sleep(3 + attempt * 3) # Wait 3s, 6s, 9s
                    continue
                return f"Error: Failed to generate response from Gemini. Details: {str(e)}"
