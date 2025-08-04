# Use an official Python runtime as a parent image
# We choose a version that is compatible with your project
FROM python:3.13.4-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies needed for Tesseract OCR
# apt-get commands are safe inside a Dockerfile's build process
RUN apt-get update && \
    apt-get install -y tesseract-ocr && \
    rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container
COPY requirements.txt ./

# Install any needed Python packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's source code to the container
COPY . .

# Expose the port on which the app will run
EXPOSE 8000

# Define the command to run the application
# This uses Uvicorn to run your FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
