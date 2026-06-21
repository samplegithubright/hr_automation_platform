import os
from PIL import Image, ImageDraw, ImageFont
from app.config import settings

class ImageGenerator:
    @classmethod
    def generate_job_card(cls, title: str, company: str, location: str, job_id: int) -> str:
        """
        Generates a 1200x630 branded social media visual with a modern dark gradient.
        Saves the file to local storage and returns the file path.
        """
        # Create a new image with RGB mode
        width, height = 1200, 630
        image = Image.new("RGB", (width, height))
        draw = ImageDraw.Draw(image)
        
        # 1. Draw a beautiful background gradient (deep indigo to dark violet)
        # We simulate a diagonal gradient by drawing lines or calculating pixel colors
        for y in range(height):
            # Interpolate colors between Deep Slate/Blue and Dark Violet
            r = int(15 + (y / height) * 20)  # 15 -> 35
            g = int(23 + (y / height) * 15)  # 23 -> 38
            b = int(42 + (y / height) * 35)  # 42 -> 77
            # Draw a horizontal line of this color
            draw.line([(0, y), (width, y)], fill=(r, g, b))
            
        # 2. Draw some subtle decorative geometric shapes (translucent circles for modern feel)
        # Pillow doesn't support transparency directly on drawing without another image, so we draw overlay circles
        overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        # Bottom-right glow
        overlay_draw.ellipse([width - 300, height - 300, width + 200, height + 200], fill=(99, 102, 241, 40))
        # Top-left glow
        overlay_draw.ellipse([-100, -100, 300, 300], fill=(139, 92, 246, 30))
        # Combine base and overlay
        image = Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")
        draw = ImageDraw.Draw(image)
        
        # 3. Draw a modern accent border
        border_thickness = 10
        draw.rectangle(
            [(border_thickness, border_thickness), (width - border_thickness, height - border_thickness)],
            outline=(99, 102, 241),  # Indigo neon border
            width=2
        )
        
        # 4. Load fonts safely
        font_paths = [
            "C:\\Windows\\Fonts\\segoeui.ttf",  # Segoe UI (Windows)
            "C:\\Windows\\Fonts\\segoeuib.ttf", # Segoe UI Bold (Windows)
            "C:\\Windows\\Fonts\\arial.ttf",    # Arial (Windows)
            "C:\\Windows\\Fonts\\arialbd.ttf"   # Arial Bold (Windows)
        ]
        
        # Find which fonts are available
        title_font = None
        subtitle_font = None
        tag_font = None
        
        # Helper to load font or return default
        def load_system_font(bold=False, size=24):
            for path in font_paths:
                if bold and "b" in os.path.basename(path).lower():
                    try:
                        return ImageFont.truetype(path, size)
                    except:
                        pass
                elif not bold and "b" not in os.path.basename(path).lower():
                    try:
                        return ImageFont.truetype(path, size)
                    except:
                        pass
            # General fallback if bold/normal not found
            for path in font_paths:
                try:
                    return ImageFont.truetype(path, size)
                except:
                    pass
            return ImageFont.load_default()
            
        title_font = load_system_font(bold=True, size=56)
        subtitle_font = load_system_font(bold=False, size=32)
        tag_font = load_system_font(bold=True, size=24)
        
        # 5. Draw Content
        # Draw "WE ARE HIRING" tag
        draw.rounded_rectangle(
            [(100, 100), (320, 140)],
            radius=20,
            fill=(99, 102, 241)  # Indigo background for badge
        )
        
        # If tag font is default, we can't draw text easily, but draw.text works
        # Center the text in the badge
        draw.text((120, 108), "WE ARE HIRING", fill=(255, 255, 255), font=tag_font)
        
        # Draw Job Title (large, bold, prominent)
        # Limit title size if too long
        display_title = title if len(title) <= 40 else title[:37] + "..."
        draw.text((100, 190), display_title, fill=(255, 255, 255), font=title_font)
        
        # Draw Company Name
        draw.text((100, 290), f"Company: {company}", fill=(229, 231, 235), font=subtitle_font)
        
        # Draw Location Badge
        draw.rounded_rectangle(
            [(100, 370), (450, 420)],
            radius=10,
            outline=(139, 92, 246),
            width=2
        )
        draw.text((120, 380), f"📍 {location}", fill=(167, 139, 250), font=tag_font)
        
        # Draw Apply Link/Footer CTA
        draw.text((100, 490), "Apply now via the application form", fill=(156, 163, 175), font=subtitle_font)
        
        # Save image to storage directory
        visuals_dir = os.path.join(settings.UPLOAD_DIR, "visuals")
        os.makedirs(visuals_dir, exist_ok=True)
        
        filename = f"job_{job_id}_social.png"
        file_path = os.path.join(visuals_dir, filename)
        image.save(file_path, "PNG")
        
        return file_path
