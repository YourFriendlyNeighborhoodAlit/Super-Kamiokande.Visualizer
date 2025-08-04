from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fetcher import fetch_latest_gif
from parser import parse_gif
import os

app = FastAPI()

@app.get("/update")
def update_event():
    path = fetch_latest_gif()
    parsed = parse_gif(path)
    return JSONResponse(content={"status": "ok", "data": parsed})

@app.get("/latest/image")
def get_latest_image():
    return FileResponse("static/latest_event.gif")

@app.get("/latest/data")
def get_latest_data():
    return FileResponse("data/latest_event.json")

# main.py
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles # Add this line
from fetcher import fetch_latest_gif
from parser import parse_gif
import os

app = FastAPI()

# Mount the static files directory
app.mount("/static", StaticFiles(directory="static"), name="static") # Add this line

@app.get("/update")
def update_event():
    path = fetch_latest_gif()
    parsed = parse_gif(path)
    return JSONResponse(content={"status": "ok", "data": parsed})

@app.get("/latest/image")
def get_latest_image():
    # Ensure this path is correct if your static files are not directly in project root
    return FileResponse("static/latest_event.gif")

@app.get("/latest/data")
def get_latest_data():
    # Ensure this path is correct
    return FileResponse("data/latest_event.json")

@app.get("/")
def read_root():
    return FileResponse("static/index.html") # Serve index.html as the root page

