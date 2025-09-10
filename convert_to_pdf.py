from fpdf import FPDF
import os

def convert_txt_to_pdf(txt_path, pdf_path):
    """
    Converts a UTF-8 encoded text file to a PDF file, supporting Vietnamese characters.
    """
    try:
        # Create PDF object
        pdf = FPDF()
        pdf.add_page()

        # Add a Unicode font that supports Vietnamese
        # You must have a .ttf font file in the same directory or provide a full path
        # Let's try to use a common font, but it's better to add one like 'DejaVuSans'
        try:
            pdf.add_font('DejaVu', '', 'DejaVuSans.ttf', uni=True)
            pdf.set_font('DejaVu', '', 12)
        except RuntimeError:
            print("Warning: DejaVuSans.ttf not found. Using Arial, which may not support all Vietnamese characters.")
            print("For best results, download DejaVuSans.ttf and place it in the project directory.")
            pdf.set_font("Arial", size=12)


        # Read the text file with UTF-8 encoding
        with open(txt_path, 'r', encoding='utf-8') as f:
            for line in f:
                # Add line to PDF
                pdf.multi_cell(0, 10, txt=line)

        # Save the PDF
        pdf.output(pdf_path)
        print(f"Successfully converted '{txt_path}' to '{pdf_path}'")

    except FileNotFoundError:
        print(f"Error: The file '{txt_path}' was not found.")
    except Exception as e:
        print(f"An error occurred during PDF conversion: {e}")

if __name__ == "__main__":
    source_file = "knowledge_source.txt"
    output_file = "knowledge_source.pdf"

    # Check if the source file exists
    if not os.path.exists(source_file):
        print(f"Source file '{source_file}' not found. Please create it first.")
    else:
        # Inform the user about the font requirement
        print("Starting PDF conversion...")
        print("Note: This script requires a Unicode font like 'DejaVuSans.ttf' for proper Vietnamese display.")
        convert_txt_to_pdf(source_file, output_file)
