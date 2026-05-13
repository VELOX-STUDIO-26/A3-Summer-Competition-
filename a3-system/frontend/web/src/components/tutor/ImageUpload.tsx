"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  onImageSelected: (file: File, preview: string) => void;
  onClear: () => void;
  selectedImage: File | null;
  imagePreview: string | null;
  disabled?: boolean;
}

export default function ImageUpload({
  onImageSelected,
  onClear,
  selectedImage,
  imagePreview,
  disabled = false,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    []
  );

  const processFile = (file: File) => {
    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a valid image file (PNG, JPG, GIF, or WebP)");
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert("Image too large. Maximum size is 5MB.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      onImageSelected(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (selectedImage && imagePreview) {
    return (
      <div className="relative inline-block">
        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#D6CFC2] bg-[#F7F5F0]">
          <img
            src={imagePreview}
            alt="Selected"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              onClick={onClear}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <p className="text-xs text-[#666] mt-1 truncate max-w-[80px]">
          {selectedImage.name.length > 10
            ? selectedImage.name.substring(0, 10) + "..."
            : selectedImage.name}
        </p>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <Button
        onClick={handleClick}
        disabled={disabled}
        size="icon"
        variant="ghost"
        className={`
          w-10 h-10 rounded-full transition-all duration-200
          ${isDragging
            ? "bg-[#B8C3C9] text-white scale-110"
            : "bg-[#E7E2D7] text-[#666] hover:bg-[#D6CFC2] hover:text-[#4a5568]"
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title="Upload image (equation, diagram, etc.)"
        type="button"
      >
        <ImagePlus className="w-5 h-5" />
      </Button>
    </div>
  );
}

interface ImageMessageProps {
  imageUrl: string;
  analysis?: string;
  isLoading?: boolean;
}

export function ImageMessage({ imageUrl, analysis, isLoading }: ImageMessageProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border border-[#D6CFC2] bg-[#F7F5F0] max-w-md">
        <img
          src={imageUrl}
          alt="Uploaded"
          className="w-full h-auto max-h-64 object-contain"
        />
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-[#8a9ba3] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analyzing image...</span>
        </div>
      )}
      {analysis && (
        <div className="text-sm text-[#2a2a2a] prose prose-sm max-w-none">
          <p className="font-medium text-[#4a5568] mb-1">Analysis:</p>
          {analysis}
        </div>
      )}
    </div>
  );
}
