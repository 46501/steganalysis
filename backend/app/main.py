from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import analyze, stego, ml, history, compare, cnn

app = FastAPI(
    title="StegoDetect AI API",
    description="Backend API for Image Steganalysis & Digital Forensics Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(analyze.router, prefix="/api", tags=["Analysis"])
app.include_router(compare.router, prefix="/api", tags=["Compare"])
app.include_router(stego.router, prefix="/api/stego", tags=["Steganography Playground"])
app.include_router(ml.router, prefix="/api/ml", tags=["Machine Learning"])
app.include_router(cnn.router, prefix="/api/cnn", tags=["CNN Model"])
app.include_router(history.router, prefix="/api/history", tags=["History & Reports"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "StegoDetect AI API is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
