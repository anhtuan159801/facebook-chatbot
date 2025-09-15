// test-rag.js - Script để test RAG system
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

class DocumentChunker {
    constructor() {
        this.chunks = [];
        this.initialized = false;
    }

    async loadAndChunkDocument(filePath) {
        try {
            console.log('📚 Loading document from:', filePath);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }
            
            // Read DOCX file
            const result = await mammoth.extractRawText({ path: filePath });
            const fullText = result.value;
            
            console.log(`📄 Document loaded, length: ${fullText.length} characters`);
            
            // Split into chapters and sections
            this.chunks = this.chunkByStructure(fullText);
            this.initialized = true;
            
            console.log(`✅ Document chunked into ${this.chunks.length} chunks`);
            return this.chunks;
        } catch (error) {
            console.error('❌ Error loading document:', error);
            throw error;
        }
    }

    chunkByStructure(text) {
        const chunks = [];
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        let currentChapter = '';
        let currentSection = '';
        let currentContent = '';
        
        console.log(`Processing ${lines.length} lines...`);
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect chapter headers (contains "Chương")
            if (line.includes('Chương') && line.includes(':')) {
                console.log(`Found chapter: ${line}`);
                
                // Save previous chunk if exists
                if (currentContent.trim()) {
                    chunks.push({
                        chapter: currentChapter,
                        section: currentSection,
                        content: currentContent.trim(),
                        metadata: {
                            type: 'content',
                            chapter: currentChapter,
                            section: currentSection
                        }
                    });
                }
                
                currentChapter = line;
                currentSection = '';
                currentContent = '';
                
                // Add chapter introduction chunk
                chunks.push({
                    chapter: currentChapter,
                    section: 'Giới thiệu chương',
                    content: line,
                    metadata: {
                        type: 'chapter_intro',
                        chapter: currentChapter
                    }
                });
            }
            // Detect section headers (starts with number like "1.1", "2.3", etc.)
            else if (/^\d+\.\d+\.?\s/.test(line)) {
                console.log(`Found section: ${line}`);
                
                // Save previous section content
                if (currentContent.trim()) {
                    chunks.push({
                        chapter: currentChapter,
                        section: currentSection,
                        content: currentContent.trim(),
                        metadata: {
                            type: 'content',
                            chapter: currentChapter,
                            section: currentSection
                        }
                    });
                }
                
                currentSection = line;
                currentContent = '';
                
                // Add section header chunk
                chunks.push({
                    chapter: currentChapter,
                    section: currentSection,
                    content: line,
                    metadata: {
                        type: 'section_header',
                        chapter: currentChapter,
                        section: currentSection
                    }
                });
            }
            // Regular content
            else {
                currentContent += line + '\n';
                
                // If content gets too long, create a chunk
                if (currentContent.length > 1500) {
                    chunks.push({
                        chapter: currentChapter,
                        section: currentSection,
                        content: currentContent.trim(),
                        metadata: {
                            type: 'content',
                            chapter: currentChapter,
                            section: currentSection
                        }
                    });
                    currentContent = '';
                }
            }
        }
        
        // Don't forget the last chunk
        if (currentContent.trim()) {
            chunks.push({
                chapter: currentChapter,
                section: currentSection,
                content: currentContent.trim(),
                metadata: {
                    type: 'content',
                    chapter: currentChapter,
                    section: currentSection
                }
            });
        }
        
        return chunks;
    }
}