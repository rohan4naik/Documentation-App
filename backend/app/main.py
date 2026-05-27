from fastapi import FastAPI
from app.routes import documents, chat
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="DocApp Python Backend")

# Enable CORS for the mobile app to communicate with the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])

@app.get("/")
async def root():
    return {"message": "Welcome to the DocApp API"}
