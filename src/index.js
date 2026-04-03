#!/usr/bin/env node
/**
 * gai-cli-msword - CLI tool for converting Markdown to Word documents
 *
 * Usage: md2word <source-md-file> <dest-docx-file>
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import sizeOf from "image-size";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    CheckBox,
    ImageRun,
    BorderStyle,
} from "docx";

function parseArgs() {
    const args = process.argv.slice(2);

    for (const arg of args) {
        if (arg === "--help" || arg === "-h") {
            printHelp();
            process.exit(0);
        }
    }

    if (args.length !== 2) {
        console.error("Error: Exactly two arguments required");
        printHelp();
        process.exit(1);
    }

    const [sourcePath, destPath] = args;

    if (!existsSync(sourcePath)) {
        console.error(`Error: Source file "${sourcePath}" does not exist`);
        process.exit(1);
    }

    return { sourcePath, destPath };
}

function printHelp() {
    console.log(`
md2word - CLI tool for converting Markdown to Word documents

Usage: md2word <source-md-file> <dest-docx-file>

Arguments:
  source-md-file       Path to the source Markdown file (required)
  dest-docx-file       Path to the output Word document (required)

Options:
  --help, -h           Show this help message

Examples:
  md2word "README.md" "output.docx"
  md2word "docs/guide.md" "dist/guide.docx"
`);
}

function parseMarkdownToDocx(markdown) {
    const lines = markdown.split("\n");
    const elements = [];
    let currentCodeBlock = [];
    let inCodeBlock = false;
    let codeBlockLanguage = "";
    let codeBlockIndent = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle horizontal rule (page break)
        if (line.trim() === "---") {
            while (
                elements.length > 0 &&
                elements[elements.length - 1].type === "emptyLine"
            ) {
                elements.pop();
            }

            elements.push({ type: "pageBreak", content: "" });

            while (i + 1 < lines.length && lines[i + 1].trim() === "") {
                i++;
            }
            continue;
        }

        // Handle code blocks (including indented ones)
        if (line.trim().startsWith("```")) {
            if (inCodeBlock) {
                elements.push({
                    type: "codeBlock",
                    content: currentCodeBlock.join("\n"),
                    language: codeBlockLanguage,
                    indent: codeBlockIndent,
                });
                currentCodeBlock = [];
                inCodeBlock = false;
                codeBlockLanguage = "";
                codeBlockIndent = 0;
            } else {
                const trimmedLine = line.trim();
                codeBlockLanguage = trimmedLine.substring(3).trim();
                inCodeBlock = true;
                const leadingSpaces = line.match(/^(\s*)/)[1].length;
                codeBlockIndent = Math.floor(leadingSpaces / 4);
            }
            continue;
        }

        if (inCodeBlock) {
            currentCodeBlock.push(line);
            continue;
        }

        // Handle headings
        if (line.startsWith("#")) {
            const level = line.match(/^#+/)[0].length;
            const text = line.substring(level).trim();
            elements.push({ type: "heading", level, content: text });
            continue;
        }

        // Handle bullet lists (including checkboxes)
        if (line.match(/^\s*[-*+]\s+/)) {
            const indent = line.match(/^\s*/)[0].length;
            let text = line.replace(/^\s*[-*+]\s+/, "");

            let isCheckbox = false;
            let isChecked = false;

            if (text.startsWith("[ ] ")) {
                isCheckbox = true;
                isChecked = false;
                text = text.substring(4);
            } else if (text.startsWith("[x] ") || text.startsWith("[X] ")) {
                isCheckbox = true;
                isChecked = true;
                text = text.substring(4);
            }

            elements.push({
                type: isCheckbox ? "checkboxItem" : "listItem",
                content: text,
                indent: Math.floor(indent / 4),
                checked: isChecked,
            });
            continue;
        }

        // Handle numbered lists
        if (line.match(/^\s*\d+\.\s+/)) {
            const indent = line.match(/^\s*/)[0].length;
            const numberMatch = line.match(/^\s*(\d+)\.\s+/);
            const originalNumber = numberMatch[1];
            const text = line.replace(/^\s*\d+\.\s+/, "");
            elements.push({
                type: "numberedListItem",
                content: text,
                indent: Math.floor(indent / 4),
                originalNumber,
            });
            continue;
        }

        // Handle images
        if (line.match(/^\s*!\[[^\]]*\]\([^)]+\)\s*$/)) {
            const indent = line.match(/^\s*/)[0].length;
            const imageMatch = line.match(/^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/);
            if (imageMatch) {
                elements.push({
                    type: "image",
                    content: imageMatch[1],
                    path: imageMatch[2],
                    indent: Math.floor(indent / 4),
                });
            }
            continue;
        }

        // Handle regular paragraphs and empty lines
        if (line.trim() !== "") {
            elements.push({ type: "paragraph", content: line.trim() });
        } else {
            elements.push({ type: "emptyLine", content: "" });
        }
    }

    return elements;
}

function createDocxElements(parsedElements, sourcePath) {
    const docxElements = [];

    for (const element of parsedElements) {
        switch (element.type) {
            case "heading": {
                const headingLevel = Math.min(element.level, 6);
                docxElements.push(
                    new Paragraph({
                        children: [new TextRun(element.content)],
                        heading:
                            headingLevel === 1 ? HeadingLevel.HEADING_1
                            : headingLevel === 2 ? HeadingLevel.HEADING_2
                            : headingLevel === 3 ? HeadingLevel.HEADING_3
                            : headingLevel === 4 ? HeadingLevel.HEADING_4
                            : headingLevel === 5 ? HeadingLevel.HEADING_5
                            : HeadingLevel.HEADING_6,
                        spacing: { before: 240, after: 120 },
                    })
                );
                break;
            }

            case "paragraph": {
                const runs = parseInlineFormatting(element.content);
                docxElements.push(
                    new Paragraph({ children: runs, spacing: { after: 120 } })
                );
                break;
            }

            case "listItem": {
                const runs = parseInlineFormatting(element.content);
                docxElements.push(
                    new Paragraph({
                        children: [new TextRun("•\t"), ...runs],
                        indent: { left: (element.indent + 1) * 360, hanging: 360 },
                        tabStops: [{ type: "left", position: (element.indent + 1) * 360 }],
                        spacing: { after: 60 },
                    })
                );
                break;
            }

            case "checkboxItem": {
                const runs = parseInlineFormatting(element.content);
                docxElements.push(
                    new Paragraph({
                        children: [
                            new CheckBox({ checked: element.checked }),
                            new TextRun("\t"),
                            ...runs,
                        ],
                        indent: { left: (element.indent + 1) * 360, hanging: 360 },
                        tabStops: [{ type: "left", position: (element.indent + 1) * 360 }],
                        spacing: { after: 60 },
                    })
                );
                break;
            }

            case "numberedListItem": {
                const runs = parseInlineFormatting(element.content);
                docxElements.push(
                    new Paragraph({
                        children: [new TextRun(`${element.originalNumber}.\t`), ...runs],
                        indent: { left: (element.indent + 1) * 360, hanging: 360 },
                        tabStops: [{ type: "left", position: (element.indent + 1) * 360 }],
                        spacing: { after: 60 },
                    })
                );
                break;
            }

            case "codeBlock": {
                const codeLines = element.content.split("\n");
                const children = [];

                if (element.language) {
                    children.push(new TextRun({
                        text: element.language,
                        font: "Consolas",
                        size: 16,
                        color: "808080",
                        italics: true,
                    }));
                    children.push(new TextRun({ break: 1 }));
                }

                codeLines.forEach((codeLine, idx) => {
                    if (idx > 0) children.push(new TextRun({ break: 1 }));
                    children.push(new TextRun({
                        text: codeLine || " ",
                        font: "Consolas",
                        size: 18,
                    }));
                });

                const borderOpts = { style: BorderStyle.SINGLE, size: 4, space: 4, color: "999999" };
                docxElements.push(
                    new Paragraph({
                        children,
                        border: { top: borderOpts, bottom: borderOpts, left: borderOpts, right: borderOpts },
                        shading: { fill: "F5F5F5" },
                        indent: { left: 288 },
                        spacing: { after: 120 },
                    })
                );
                break;
            }

            case "pageBreak": {
                docxElements.push(
                    new Paragraph({
                        children: [],
                        pageBreakBefore: true,
                        spacing: { before: 0, after: 0 },
                    })
                );
                break;
            }

            case "emptyLine": {
                docxElements.push(new Paragraph({ text: "", spacing: { after: 60 } }));
                break;
            }

            case "image": {
                try {
                    const markdownDir = dirname(resolve(sourcePath));
                    const absoluteImagePath = resolve(markdownDir, element.path);

                    if (existsSync(absoluteImagePath)) {
                        const imageBuffer = readFileSync(absoluteImagePath);

                        let scaledWidth, scaledHeight;
                        try {
                            const dimensions = sizeOf(imageBuffer);
                            const maxWidth = 400;
                            const scaleFactor = Math.min(maxWidth / dimensions.width, 1);
                            scaledWidth = Math.round(dimensions.width * scaleFactor);
                            scaledHeight = Math.round(dimensions.height * scaleFactor);
                        } catch {
                            scaledWidth = 400;
                            scaledHeight = 300;
                        }

                        docxElements.push(
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imageBuffer,
                                        transformation: { width: scaledWidth, height: scaledHeight },
                                        type: "png",
                                    }),
                                ],
                                indent: { left: element.indent * 360 },
                            })
                        );
                    }
                } catch {
                    // Silently skip image on error
                }
                break;
            }
        }
    }

    return docxElements;
}

function parseInlineFormatting(text) {
    const runs = [];
    let currentText = "";
    let i = 0;

    while (i < text.length) {
        // Handle bold (**text**)
        if (text.substr(i, 2) === "**") {
            if (currentText) {
                runs.push(new TextRun(currentText));
                currentText = "";
            }
            i += 2;
            const endIndex = text.indexOf("**", i);
            if (endIndex !== -1) {
                runs.push(new TextRun({ text: text.substring(i, endIndex), bold: true }));
                i = endIndex + 2;
            } else {
                currentText += "**";
            }
            continue;
        }

        // Handle italic (*text*)
        if (text[i] === "*" && text.substr(i, 2) !== "**") {
            if (currentText) {
                runs.push(new TextRun(currentText));
                currentText = "";
            }
            i += 1;
            const endIndex = text.indexOf("*", i);
            if (endIndex !== -1) {
                runs.push(new TextRun({ text: text.substring(i, endIndex), italics: true }));
                i = endIndex + 1;
            } else {
                currentText += "*";
            }
            continue;
        }

        // Handle inline code (`text`)
        if (text[i] === "`") {
            if (currentText) {
                runs.push(new TextRun(currentText));
                currentText = "";
            }
            i += 1;
            const endIndex = text.indexOf("`", i);
            if (endIndex !== -1) {
                runs.push(
                    new TextRun({
                        text: text.substring(i, endIndex),
                        font: "Consolas",
                        shading: { fill: "F5F5F5" },
                    })
                );
                i = endIndex + 1;
            } else {
                currentText += "`";
            }
            continue;
        }

        currentText += text[i];
        i++;
    }

    if (currentText) {
        runs.push(new TextRun(currentText));
    }

    return runs.length > 0 ? runs : [new TextRun("")];
}

async function main() {
    const { sourcePath, destPath } = parseArgs();

    console.error(`Converting ${sourcePath} to ${destPath}...`);

    const markdownContent = readFileSync(sourcePath, "utf-8");
    const parsedElements = parseMarkdownToDocx(markdownContent);
    const docxElements = createDocxElements(parsedElements, sourcePath);

    const doc = new Document({
        styles: {
            paragraphStyles: [
                {
                    id: "default",
                    name: "Default",
                    basedOn: "Normal",
                    next: "default",
                    run: {
                        size: 22,
                        font: "Calibri",
                    },
                    paragraph: {
                        spacing: {
                            line: 276,
                            lineRule: "auto",
                        },
                    },
                },
            ],
        },
        sections: [{ children: docxElements }],
    });

    const buffer = await Packer.toBuffer(doc);

    const destDir = dirname(resolve(destPath));
    if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
    }

    writeFileSync(destPath, buffer);
    console.log(destPath);
}

main().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
});
