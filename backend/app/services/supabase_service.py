from supabase import create_client, Client
from app.config import settings

class SupabaseService:
    def __init__(self):
        self.client: Client = create_client(settings.supabase_url, settings.supabase_key)

    def upload_file(self, file_bytes: bytes, file_path: str, content_type: str):
        # Upload original file to storage
        response = self.client.storage.from_("document_files").upload(
            path=file_path,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        return response

    def create_document(self, document_data: dict):
        response = self.client.table("documents").insert(document_data).execute()
        return response.data[0]
