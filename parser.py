from PIL import Image
import pytesseract
import json
from pathlib import Path

# Set the Tesseract executable path
# IMPORTANT: Ensure this path is correct for your Tesseract installation
pytesseract.pytesseract.tesseract_cmd = r"C:\Users\bearm\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"


def extract_metadata(image: Image.Image) -> dict:
    # Metadata region identified (top-left text block)
    cropped = image.crop((0, 0, 400, 200)) # This crop seems fine for the text
    text = pytesseract.image_to_string(cropped)
    lines = text.strip().split("\n")
    metadata = {}
    for line in lines:
        if ":" in line:
            key, value = line.split(":", 1)
            metadata[key.strip()] = value.strip()
    return metadata


def extract_ellipse_hits(cropped: Image.Image, region_name: str) -> list:
    hits = []
    w, h = cropped.size
    cx = w / 2
    cy = h / 2
    a = w / 2 # Horizontal radius
    b = h / 2 # Vertical radius

    pixels = cropped.load()

    for y in range(h):
        for x in range(w):
            norm_x = (x - cx) / a
            norm_y = (y - cy) / b
            # Check if pixel is within the ellipse boundary (x^2/a^2 + y^2/b^2 <= 1)
            if norm_x**2 + norm_y**2 <= 1.0:
                # Access pixel values; since we convert to RGB in parse_gif, this should always be a tuple
                # However, added explicit check for robustness in case a cropped image somehow reverts mode
                if cropped.mode == 'L': # If it's a grayscale image (unexpected if parse_gif works)
                    r, g, b_val = (pixels[x, y], pixels[x, y], pixels[x, y])
                else:
                    r, g, b_val = pixels[x, y][:3]
                # Only include non-black pixels (representing PMT hits)
                if (r, g, b_val) != (0, 0, 0):
                    hits.append({
                        "region": region_name,
                        "x": x, # x-coordinate relative to the cropped image
                        "y": y, # y-coordinate relative to the cropped image
                        "color": (r, g, b_val)
                    })
    return hits


def extract_pixels(image: Image.Image):
    data = []

    # Barrel (rectangular)
    # The barrel spans from y=291 to y=579
    # It seems to start around x=30 and end around x=939 (image.width - 60)
    barrel_crop = image.crop((30, 291, image.width - 60, 579))
    barrel_pixels = barrel_crop.load()
    for y in range(barrel_crop.height):
        for x in range(barrel_crop.width):
            # Access pixel values; since we convert to RGB in parse_gif, this should always be a tuple
            # However, added explicit check for robustness
            if barrel_crop.mode == 'L': # If it's a grayscale image (unexpected if parse_gif works)
                r, g, b = (barrel_pixels[x, y], barrel_pixels[x, y], barrel_pixels[x, y])
            else:
                r, g, b = barrel_pixels[x, y][:3]
            if (r, g, b) != (0, 0, 0): # Exclude black pixels
                data.append({
                    "region": "barrel",
                    "x": x,
                    "y": y,
                    "color": (r, g, b)
                })

    # Ceiling (upper ellipse)
    # Based on skev.gif, the upper ellipse is approximately from x=453 to x=863 and y=21 to y=291
    ceiling_crop = image.crop((453, 21, 863, 291))
    data += extract_ellipse_hits(ceiling_crop, "ceiling")

    # Floor (lower ellipse)
    # Based on skev.gif, the lower ellipse is approximately from x=453 to x=863 and y=579 to y=849
    floor_crop = image.crop((453, 579, 863, 849))
    data += extract_ellipse_hits(floor_crop, "floor")

    return data


def parse_gif(path: Path):
    with Image.open(path) as img:
        img.seek(0)
        # CRITICAL FIX: Convert image to RGB mode to ensure consistent pixel access
        # This will convert grayscale or paletted images (like some GIFs) to RGB,
        # ensuring pixel data can always be accessed as a tuple (r, g, b)
        img_rgb = img.convert("RGB")
        metadata = extract_metadata(img_rgb)
        hits = extract_pixels(img_rgb)

        result = {"metadata": metadata, "hits": hits}
        output_path = Path("data/latest_event.json")
        output_path.parent.mkdir(exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
        return result