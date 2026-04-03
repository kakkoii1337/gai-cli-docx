---
name: gai-docx
description: "CLI tool for converting Markdown to Word documents. Use when: user wants to convert a Markdown file to a .docx Word document."
homepage: https://github.com/kakkoii1337/gai-cli-docx
---

# md2word

CLI tool for converting Markdown files to Word documents (.docx).

## Installation

```bash
npm install -g gai-cli-docx
```

Or run directly:

```bash
npx gai-cli-docx "document.md" "output.docx"
```

## Usage

```bash
md2word <source-md-file> <dest-docx-file>
```

### Arguments

- `source-md-file` - Path to the source Markdown file (required)
- `dest-docx-file` - Path to the output Word document (required)

### Options

- `--help, -h` - Show help message

### Examples

```bash
# Basic conversion
md2word "README.md" "output.docx"

# Save to a subdirectory
md2word "docs/guide.md" "dist/guide.docx"
```

## Output

Writes a `.docx` Word document to the specified destination path. Prints the output path to stdout on success.

## Notes

- Supports headings (H1–H6), paragraphs, bullet lists, numbered lists, checkboxes, code blocks, inline formatting (bold, italic, code), images, and page breaks
- Images are resolved relative to the source Markdown file's directory
- Uses Calibri 11pt with 1.15 line spacing by default
- Code blocks use Consolas 10pt with grey background shading
