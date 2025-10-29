const path = require("path");
const fs = require("fs");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  ImageRun,
} = require("docx");
const PDFDocument = require("pdfkit");
const MarkdownIt = require("markdown-it");

const Book = require("../Models/Book");

const md = new MarkdownIt();

// Typography configuration matching the PDF export
const DOCX_STYLES = {
  fonts: {
    body: "Charter",
    heading: "Inter",
  },
  sizes: {
    title: 32,
    subtitle: 20,
    author: 18,
    chapterTitle: 24,
    h1: 20,
    h2: 18,
    h3: 16,
    body: 12,
  },
  spacing: {
    paragraphBefore: 200,
    paragraphAfter: 200,
    chapterBefore: 400,
    chapterAfter: 300,
    headingBefore: 300,
    headingAfter: 150,
  },
};

const processMarkdownToDocx = (markdown) => {
  const tokens = md.parse(markdown, {});
  const paragraphs = [];
  let inList = false;
  let listType = null;
  let orderedCounter = 1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    try {
      if (token.type === "heading_open") {
        const level = parseInt(token.tag.substring(1), 10);
        const nextToken = tokens[i + 1];

        if (nextToken && nextToken.type === "inline") {
          let headingLevel;
          let fontSize;

          switch (level) {
            case 1:
              headingLevel = HeadingLevel.HEADING_1;
              fontSize = DOCX_STYLES.sizes.h1;
              break;
            case 2:
              headingLevel = HeadingLevel.HEADING_2;
              fontSize = DOCX_STYLES.sizes.h2;
              break;
            case 3:
              headingLevel = HeadingLevel.HEADING_3;
              fontSize = DOCX_STYLES.sizes.h3;
              break;
            default:
              headingLevel = HeadingLevel.HEADING_3;
              fontSize = DOCX_STYLES.sizes.h3;
          }

          paragraphs.push(
            new Paragraph({
              text: nextToken.content,
              heading: headingLevel,
              spacing: {
                before: DOCX_STYLES.spacing.headingBefore,
                after: DOCX_STYLES.spacing.headingAfter,
              },
              style: {
                font: DOCX_STYLES.fonts.heading,
                size: fontSize * 2, // docx uses half-points
              },
            })
          );

          i += 2; // Skip inline and heading_close
        }
      } else if (token.type === "paragraph_open") {
        const nextToken = tokens[i + 1];

        if (nextToken && nextToken.type === "inline" && nextToken.children) {
          const textRuns = processInlineContent(nextToken.children);

          if (textRuns.length > 0) {
            paragraphs.push(
              new Paragraph({
                children: textRuns,
                spacing: {
                  before: inList ? 100 : DOCX_STYLES.spacing.paragraphBefore,
                  after: inList ? 100 : DOCX_STYLES.spacing.paragraphAfter,
                },
                alignment: AlignmentType.JUSTIFIED,
              })
            );
          }

          i += 2;
        } else if (token.type === "bullet_list_open") {
          inList = true;
          listType = "bullet";
        } else if (token.type === "bullet_list_close") {
          inList = false;
          listType = null;

          // Add spacing after list
          paragraphs.push(new Paragraph({ text: "", spacing: { after: 100 } }));
        } else if (token.type === "bullet_list_open") {
          inList = true;
          listType = "ordered";
          orderedCounter = 1;
        } else if ((token.type = "ordered_list_close")) {
          inList = false;
          listType = null;
          orderedCounter = 1;

          paragraphs.push(new Paragraph({ text: "", spacing: { after: 100 } }));
        } else if (token.type === "list_item_open") {
          const nextToken = tokens[i + 1];

          if (nextToken && nextToken.type === "paragraph_open") {
            const inlineToken = tokens[i + 2];

            if (
              inlineToken &&
              inlineToken.type === "inline" &&
              inlineToken.children
            ) {
              const textRuns = processInlineContent(inlineToken.children);

              let bulletText = "";
              if (listType === "bullet") {
                bulletText = "• ";
              } else if (listType === "ordered") {
                bulletText = `${orderedCounter}. `;
              }

              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: bulletText,
                      font: DOCX_STYLES.fonts.body,
                    }),
                    ...textRuns,
                  ],
                  spacing: { before: 50, after: 50 },
                  indent: { left: 720 }, // 0.5 inch indent
                })
              );

              i += 4; // Skip paragraph_open, inline, paragraph_close, list_item_close
            }
          }
        } else if (token.type === "blockquote_open") {
          // Find the blockquote content
          const nextToken = tokens[i + 1];

          if (nextToken && nextToken.type === "paragraph_open") {
            const inlineToken = tokens[i + 2];

            if (inlineToken && inlineToken.type === "inline") {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: inlineToken.content,
                      italics: true,
                      font: DOCX_STYLES.fonts.body,
                      color: "666666",
                    }),
                  ],
                  alignment: AlignmentType.JUSTIFIED,
                  spacing: { before: 2000, after: 200 },
                  indent: { left: 720 },
                  border: {
                    left: {
                      color: "4F46E5",
                      space: 1,
                      style: "single",
                      size: 24,
                    },
                  },
                })
              );

              i += 4;
            }
          }
        } else if (token.type === "code_block" || token.type === "fence") {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: token.content,
                  font: "Courier New",
                  size: 20,
                  color: "1A202C",
                }),
              ],
              spacing: { before: 2000, after: 400 },
              shading: {
                fill: "F5F5F5",
              },
            })
          );
        } else if (token.type === "hr") {
          paragraphs.push(
            new Paragraph({
              text: "",
              border: {
                bottom: {
                  color: "CCCCCC",
                  space: 1,
                  style: "single",
                  size: 6,
                },
              },
              spacing: { before: 200, after: 200 },
            })
          );
        }
      }
    } catch (tokenError) {
      console.error("Error processing token: ", token.type, tokenError);
      continue;
    }
  }

  return paragraphs;
};

// Process inline content (bold, italic, text)
const processInlineContent = (children) => {
  const textRuns = [];
  let currentFormatting = { bold: false, italic: false };
  let textBuffer = "";

  const flushText = () => {
    if (textBuffer.trim()) {
      textRuns.push(
        new TextRun({
          text: textBuffer,
          bold: currentFormatting.bold,
          italics: currentFormatting.italic,
          font: DOCX_STYLES.fonts.body,
          size: DOCX_STYLES.sizes.body * 2,
        })
      );

      textBuffer = "";
    }
  };

  children.forEach((child) => {
    if (child.type === "strong_open") {
      flushText();
      currentFormatting.bold = true;
    } else if (child.type === "strong_close") {
      flushText();
      currentFormatting.bold = false;
    } else if (child.type === "em_open") {
      flushText();
      currentFormatting.italic = true;
    } else if (child.type === "em_close") {
      flushText();
      currentFormatting.italic = false;
    } else if (child.type === "text") {
      textBuffer += child.content;
    }
  });

  flushText();

  return textRuns;
};

const exportAsDocument = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const sections = [];

    // Cover page with image if available
    const coverPage = [];

    if (book.coverImage && !book.coverImage.includes("pravatar")) {
      const path = require("path");

      // Normalize and make it relative to backend directory
      let imagePath = book.coverImage.replace(/\\/g, "/"); // fix backslashes

      // Remove leading slash if present
      if (imagePath.startsWith("/")) {
        imagePath = imagePath.substring(1);
      }

      // Resolve absolute path (backend/../uploads/coverImage-xxxx.jpg)
      imagePath = path.resolve(__dirname, "..", imagePath);

      try {
        if (fs.existsSync(imagePath)) {
          const imageBuffer = fs.readFileSync(imagePath);

          // Add some top spacing
          coverPage.push(
            new Paragraph({
              text: "",
              spacing: { before: 1000 },
            })
          );

          // Add image centred on page
          coverPage.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  transformation: {
                    width: 400, // Width in pixels
                    height: 500, // Height in pixels
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 400 },
            })
          );

          // Page break after cover
          coverPage.push(
            new Paragraph({
              text: "",
              pageBreakBefore: true,
            })
          );
        }
      } catch (imgErr) {
        console.error(`Could not embed image: ${imagePath}`, imgErr);
      }
    }

    sections.push(...coverPage);

    // Title page section
    const titlePage = [];

    // Main title
    titlePage.push(
      new Paragraph({
        children: [
          new TextRun({
            text: book.title,
            bold: true,
            font: DOCX_STYLES.fonts.heading,
            size: DOCX_STYLES.sizes.title * 2,
            color: "1A202C",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000, after: 400 },
      })
    );

    // Subtitle if exists
    if (book.subtitle && book.subtitle.trim()) {
      titlePage.push(
        new Paragraph({
          children: [
            new TextRun({
              text: book.subtitle,
              font: DOCX_STYLES.fonts.heading,
              size: DOCX_STYLES.sizes.subtitle * 2,
              color: "4A5568",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        })
      );
    }

    // Author
    titlePage.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `by ${book.author}`,
            font: DOCX_STYLES.fonts.heading,
            size: DOCX_STYLES.sizes.author * 2,
            color: "2D3748",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Decorative line
    titlePage.push(
      new Paragraph({
        text: "",
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: "single",
            size: 12,
          },
        },
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      })
    );

    sections.push(...titlePage);

    // Process chapters
    book.chapters.forEach((chapter, index) => {
      try {
        // Page break before each chapter (except first)
        if (index > 0) {
          sections.push(
            new Paragraph({
              text: "",
              pageBreakBefore: true,
            })
          );
        }

        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: chapter.title,
                bold: true,
                font: DOCX_STYLES.fonts.heading,
                size: DOCX_STYLES.sizes.chapterTitle * 2,
                color: "1A202C",
              }),
            ],
            spacing: {
              before: DOCX_STYLES.spacing.chapterBefore,
              after: DOCX_STYLES.spacing.chapterAfter,
            },
          })
        );

        // Chapter content
        const contentParagraphs = processMarkdownToDocx(chapter.content || "");

        sections.push(...contentParagraphs);
      } catch (chapterError) {
        console.error(`Error processing chapter ${index}: `, chapterError);
      }
    });

    // Create the document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children: sections,
        },
      ],
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    // Send the document
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${book.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx"`
    );

    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);
  } catch (error) {
    console.log("Error exporting document: ", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Server error during document export",
        error: error.message,
      });
    }
  }
};

// Typography configuration for modern ebook styling
const TYPOGRAPHY = {
  fonts: {
    serif: "Times-Roman",
    serifBold: "Times-Bold",
    serifItalic: "Times-Italic",
    sans: "Helvetica",
    sansBold: "Helvetica-Bold",
    sansOblique: "Helvetica-Oblique",
  },
  sizes: {
    title: 28,
    author: 16,
    chapterTitle: 20,
    h1: 18,
    h2: 16,
    h3: 14,
    body: 11,
    caption: 9,
  },
  spacing: {
    paragraphSpacing: 12,
    chapterSpacing: 24,
    headingSpacing: { before: 16, after: 8 },
    listSpacing: 6,
  },
  colors: {
    text: "#33333",
    heading: "#1A1A1A",
    accent: "#4F46E5",
  },
};

const renderInlineTokens = (doc, tokens, options = {}) => {
  if (!tokens || tokens.length === 0) return;

  const baseOptions = {
    align: options.align || "justify",
    indent: options.indent || 0,
    lineGap: options.lineGap || 2,
  };

  let currentFont = TYPOGRAPHY.fonts.serif;
  let textBuffer = "";

  const flushBuffer = () => {
    if (textBuffer) {
      doc.font(currentFont).text(textBuffer, {
        ...baseOptions,
        continued: true,
      });
      textBuffer = "";
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "text") {
      textBuffer += token.content;
    } else if (token.type === "strong_open") {
      flushBuffer();
      currentFont = TYPOGRAPHY.fonts.serifBold;
    } else if (token.type === "strong_close") {
      flushBuffer();
      currentFont = TYPOGRAPHY.fonts.serif;
    } else if (token.type === "em_open") {
      flushBuffer();
      currentFont = TYPOGRAPHY.fonts.serifItalic;
    } else if (token.type === "em_close") {
      flushBuffer();
      currentFont = TYPOGRAPHY.fonts.serif;
    } else if (token.type === "code_inline") {
      flushBuffer();
      doc.font("Courier").text(token.content, {
        ...baseOptions,
        continued: true,
      });
      doc.font(currentFont);
    }
  }

  if (textBuffer) {
    doc.font(currentFont).text(textBuffer, {
      ...baseOptions,
      continued: false,
    });
  } else {
    doc.text("", { continued: false });
  }
};

const renderMarkdown = (doc, markdown) => {
  if (!markdown || markdown.trim() === "") return;

  const tokens = md.parse(markdown, {});
  let inList = false;
  let listType = null;
  let orderedListCounter = 1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    try {
      if (token.type === "heading_open") {
        const level = parseInt(token.tag.substring(1), 10);
        let fontSize;

        switch (level) {
          case 1:
            fontSize = TYPOGRAPHY.sizes.h1;
            break;
          case 2:
            fontSize = TYPOGRAPHY.sizes.h2;
            break;
          case 3:
            fontSize = TYPOGRAPHY.sizes.h3;
            break;
          default:
            fontSize = TYPOGRAPHY.sizes.h3;
        }

        doc.moveDown(
          TYPOGRAPHY.spacing.headingSpacing.before / TYPOGRAPHY.sizes.body
        );

        doc
          .font(TYPOGRAPHY.fonts.sansBold)
          .fontSize(fontSize)
          .fillColor(TYPOGRAPHY.colors.heading);

        if (i + 1 < tokens.length && tokens[i + 1].type === "inline") {
          renderInlineTokens(doc, token[i + 1].children, {
            align: "left",
            lineGap: 0,
          });

          i++;
        }

        doc.moveDown(
          TYPOGRAPHY.spacing.headingSpacing.after / TYPOGRAPHY.sizes.body
        );

        if (i + 1 < tokens.length && tokens[i + 1].type === "heading_close") {
          i++;
        }
      } else if (token.type === "paragraph_open") {
        doc
          .font(TYPOGRAPHY.fonts.serif)
          .fontSize(TYPOGRAPHY.sizes.body)
          .fillColor(TYPOGRAPHY.colors.text);

        if (i + 1 < tokens.length && tokens[i + 1].type === "inline") {
          renderInlineTokens(doc, tokens[i + 1].children, {
            align: "justify",
            lineGap: 2,
          });

          i++;
        }

        if (!inList) {
          doc.moveDown(
            TYPOGRAPHY.spacing.paragraphSpacing / TYPOGRAPHY.sizes.body
          );
        }

        if (i + 1 < tokens.length && tokens[i + 1].type === "paragraph_close") {
          i++;
        }
      } else if (token.type === "bullet_list_open") {
        inList = true;
        listType = "bullet";
        doc.moveDown(TYPOGRAPHY.spacing.listSpacing / TYPOGRAPHY.sizes.body);
      } else if (token.type === "bullet_list_close") {
        inList = false;
        listType = null;
        doc.moveDown(
          TYPOGRAPHY.spacing.paragraphSpacing / TYPOGRAPHY.sizes.body
        );
      } else if (token.type === "ordered_list_open") {
        inList = true;
        listType = "ordered";
        orderedListCounter = 1;
        doc.moveDown(TYPOGRAPHY.spacing.listSpacing / TYPOGRAPHY.sizes.body);
      } else if (token.type === "bullet_list_close") {
        inList = false;
        listType = null;
        orderedListCounter = 1;
        doc.moveDown(
          TYPOGRAPHY.spacing.paragraphSpacing / TYPOGRAPHY.sizes.body
        );
      } else if (token.type === "list_item_open") {
        let bullet = "";

        if (listType === "bullet") {
          bullet = "• ";
        } else if (listType === "ordered") {
          bullet = `${orderedListCounter}. `;
          orderedListCounter++;
        }

        doc
          .font(TYPOGRAPHY.fonts.serif)
          .fontSize(TYPOGRAPHY.sizes.body)
          .fillColor(TYPOGRAPHY.colors.text);

        doc.text(bullet, { indent: 20, continued: true });

        for (let j = i + 1; j < tokens.length; j++) {
          if (tokens[j].type === "inline" && tokens[j].children) {
            renderInlineTokens(doc, token[j].children, {
              align: "left",
              lineGap: 2,
            });
            break;
          } else if (token[j].type === "list_item_close") {
            break;
          }
        }

        doc.moveDown(TYPOGRAPHY.spacing.listSpacing / TYPOGRAPHY.sizes.body);
      } else if (token.type === "code_block" || token.type === "fence") {
        doc.moveDown(
          TYPOGRAPHY.spacing.paragraphSpacing / TYPOGRAPHY.sizes.body
        );

        doc
          .font("Courier")
          .fontSize(9)
          .fillColor(TYPOGRAPHY.colors.text)
          .text(token.content, {
            indent: 20,
            align: "left",
          });

        doc.font(TYPOGRAPHY.fonts.serif).fontSize(TYPOGRAPHY.sizes.body);

        doc.moveDown(
          TYPOGRAPHY.spacing.paragraphSpacing / TYPOGRAPHY.sizes.body
        );
      } else if (token.type === "hr") {
        doc.moveDown();

        const y = doc.y;

        doc
          .moveTo(doc.page.margins.left, y)
          .lineTo(doc.page.width - doc.page.margins.right, y)
          .stroke();

        doc.moveDown();
      }
    } catch (tokenError) {
      console.error("Error processing token: ", token.type, tokenError);
    }
  }
};

const exportAsPDF = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    if (book.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Create PDF with safe settings
    const doc = new PDFDocument({
      margin: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
      autoFirstPage: true,
    });

    // set headers before piping
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${book.title.replace(/[^a-zA-Z0-9]/g, "-")}.pdf"`
    );

    doc.pipe(res);

    // Cover page with if available
    if (book.coverImage && !book.coverImage.includes("pravatar")) {
      const path = require("path");

      // Normalize and make it relative to backend directory
      let imagePath = book.coverImage.replace(/\\/g, "/"); // fix backslashes

      // Remove leading slash if present
      if (imagePath.startsWith("/")) {
        imagePath = imagePath.substring(1);
      }

      // Resolve absolute path (backend/../uploads/coverImage-xxxx.jpg)
      imagePath = path.resolve(__dirname, "..", imagePath);

      try {
        if (fs.existsSync(imagePath)) {
          const { width, height } = doc.page;

          const pageWidth =
            width - doc.page.margins.left - doc.page.margins.right;
          const pageHeight =
            height - doc.page.margins.top - doc.page.margins.bottom;

          doc.image(imagePath, doc.page.margins.left, doc.page.margins.top, {
            fit: [pageWidth * 0.8, pageHeight * 0.8],
            align: "center",
            valign: "center",
          });

          doc.addPage();
        }
      } catch (imgErr) {
        console.error(`Could not embed image: ${imagePath}`, imgErr);
      }
    }

    // Title page
    doc
      .font(TYPOGRAPHY.fonts.sansBold)
      .fontSize(TYPOGRAPHY.sizes.title)
      .fillColor(TYPOGRAPHY.colors.heading)
      .text(book.title, { align: "center" });

    doc.moveDown(2);

    if (book.subtitle && book.subtitle.trim()) {
      doc
        .font(TYPOGRAPHY.fonts.sans)
        .fontSize(TYPOGRAPHY.sizes.h2)
        .fillColor(TYPOGRAPHY.colors.text)
        .text(book.subtitle, { align: "center" });

      doc.moveDown(1);
    }

    doc
      .font(TYPOGRAPHY.fonts.sans)
      .fontSize(TYPOGRAPHY.sizes.author)
      .fillColor(TYPOGRAPHY.colors.text)
      .text(`by ${book.author}`, { align: "center" });

    //Process chapters
    if (book.chapters && book.chapters.length > 0) {
      book.chapters.forEach((chapter, index) => {
        try {
          doc.addPage();

          // Chapter title
          doc
            .font(TYPOGRAPHY.fonts.sansBold)
            .fontSize(TYPOGRAPHY.sizes.chapterTitle)
            .fillColor(TYPOGRAPHY.colors.heading)
            .text(chapter.title || `Chapter ${index + 1}`, { align: "left" });

          doc.moveDown(
            TYPOGRAPHY.spacing.chapterSpacing / TYPOGRAPHY.sizes.body
          );

          // Chapter content
          if (chapter.content && chapter.content.trim()) {
            renderMarkdown(doc, chapter.content);
          }
        } catch (chapterError) {
          console.error(`Error processing chapter ${index}: `, chapterError);
        }
      });
    }

    // Finalize the document
    doc.end();
  } catch (error) {
    console.error("Error exporting PDF: ", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Server error during PDF export",
        error: error.message,
      });
    }
  }
};

module.exports = { exportAsPDF, exportAsDocument };
