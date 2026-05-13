# Implementation Plan: Image Input & Diagram Output

## Overview
Add multimodal capabilities to the AI tutor:
1. **Image Input**: Allow students to upload images (equations, diagrams) and get them analyzed
2. **Diagram Output**: Generate visual diagrams in tutor responses (Mermaid, ASCII, SVG)

---

## Phase 1: Image Input (Equation/Diagram Upload)

### Backend Changes

#### 1. New API Endpoint: `/api/tutor/analyze-image`
**File**: `backend/api/routers/tutor.py`

```python
@router.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    question: str = Form(""),
    student_id: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Analyze an uploaded image (equation, diagram, etc.) and answer questions about it."""
    # Save image temporarily
    # Convert to base64
    # Call vision-capable LLM (Gemini/OpenRouter with vision)
    # Return analysis + answer to question
```

#### 2. Vision LLM Client
**File**: `backend/core/vision_llm_client.py` (new)

- Support for multimodal LLMs that accept images
- OpenRouter with vision models (GPT-4V, Claude 3, Gemini)
- Base64 image encoding
- Prompt template for image analysis

#### 3. Database Schema
**File**: `backend/models/database.py`

Add to `ChatMessage`:
```python
image_url: Optional[str] = Column(String(500), nullable=True)
image_analysis: Optional[str] = Column(Text, nullable=True)  # AI's description of image
```

### Frontend Changes

#### 1. Image Upload Component
**File**: `frontend/web/src/components/tutor/ImageUpload.tsx` (new)

- Drag & drop zone
- Image preview
- File validation (max size, allowed types: jpg, png, gif)
- Upload progress indicator

#### 2. Update Chat Interface
**File**: `frontend/web/src/app/(dashboard)/notebook/page.tsx`

- Add image upload button next to send button
- Display uploaded images in chat
- Show image analysis alongside text responses

---

## Phase 2: Diagram Output (Auto-Generated SVG)

### Backend Changes

#### 1. Update Tutor Prompts
**File**: `backend/core/tutor_engine.py`

Modify `_build_messages()` to include instructions for diagram generation:
```
When explaining concepts that benefit from visualization, generate diagrams using:
- Mermaid syntax for flowcharts, sequence diagrams, class diagrams
- ASCII art for simple diagrams
- Graphviz DOT format for complex graphs

Wrap diagrams in ```mermaid or ```ascii code blocks.
```

#### 2. Diagram Parser
**File**: `backend/core/diagram_generator.py` (new)

```python
class DiagramGenerator:
    def extract_diagrams(self, text: str) -> List[Diagram]:
        """Extract mermaid, ascii, or dot diagrams from response."""
        
    def validate_mermaid(self, code: str) -> bool:
        """Check if mermaid syntax is valid."""
        
    def convert_to_svg(self, mermaid_code: str) -> str:
        """Convert mermaid to SVG using mermaid.js or similar."""
```

### Frontend Changes

#### 1. Mermaid Renderer
**File**: `frontend/web/src/components/MermaidRenderer.tsx` (new)

- Use `mermaid` npm package to render diagrams
- Support for:
  - Flowcharts
  - Sequence diagrams
  - Class diagrams
  - State diagrams
  - ER diagrams

#### 2. Message Rendering
**File**: `frontend/web/src/app/(dashboard)/notebook/page.tsx`

- Detect ```mermaid code blocks
- Render using MermaidRenderer component
- Show SVG output instead of raw text
- Allow zoom/download of diagrams

---

## Implementation Details

### Image Input Flow
1. Student drags/uploads image to chat
2. Frontend sends to `/api/tutor/analyze-image`
3. Backend converts image to base64
4. Calls vision LLM with prompt: "Analyze this image and answer: {question}"
5. Returns analysis + saves to database
6. Frontend displays image + analysis in chat

### Diagram Output Flow
1. Student asks question requiring visualization
2. Backend tutor engine generates response with ```mermaid block
3. Frontend detects mermaid blocks
4. Renders using mermaid.js library
5. Shows interactive diagram in chat

---

## Files to Modify/Create

### Backend
- `backend/api/routers/tutor.py` - Add analyze-image endpoint
- `backend/core/tutor_engine.py` - Update prompts for diagram generation
- `backend/core/vision_llm_client.py` - NEW: Vision-capable LLM client
- `backend/core/diagram_generator.py` - NEW: Diagram extraction/validation
- `backend/models/database.py` - Add image fields to ChatMessage

### Frontend
- `frontend/web/src/components/tutor/ImageUpload.tsx` - NEW
- `frontend/web/src/components/MermaidRenderer.tsx` - NEW
- `frontend/web/src/app/(dashboard)/notebook/page.tsx` - Add image upload + diagram rendering
- `frontend/web/src/lib/api.ts` - Add analyzeImage API function

---

## Testing Plan

1. **Image Input**
   - Upload equation image, verify LaTeX extraction
   - Upload diagram, verify description accuracy
   - Test with no question (just analyze)
   - Test error handling (unsupported file type)

2. **Diagram Output**
   - Ask for flowchart, verify mermaid generation
   - Ask for architecture diagram
   - Test invalid mermaid syntax handling
   - Verify SVG renders correctly

---

## Dependencies

### Backend
- Pillow (image processing)
- base64 encoding (built-in)

### Frontend
- `mermaid` (diagram rendering)
- `react-dropzone` (file upload)

---

## Priority

1. **Image Input** - Higher impact, helps students who struggle to type equations
2. **Diagram Output** - Enhances explanations for visual learners

Both can be implemented independently.
