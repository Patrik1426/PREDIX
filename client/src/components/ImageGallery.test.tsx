import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ImageGallery, { ImageThumbnail, ImagePreviewModal } from "./ImageGallery";

const mockImages = [
  {
    id: 1,
    fileName: "foto1.jpg",
    s3Url: "https://example.com/foto1.jpg",
    fileSize: 1024000,
    uploadedAt: new Date("2026-03-19"),
    mimeType: "image/jpeg",
  },
  {
    id: 2,
    fileName: "foto2.png",
    s3Url: "https://example.com/foto2.png",
    fileSize: 2048000,
    uploadedAt: new Date("2026-03-19"),
    mimeType: "image/png",
  },
];

describe("ImageGallery Component", () => {
  it("renders empty state when no images provided", () => {
    render(<ImageGallery images={[]} />);
    expect(screen.getByText("No hay imágenes para mostrar")).toBeInTheDocument();
  });

  it("renders gallery title with image count", () => {
    render(<ImageGallery images={mockImages} />);
    expect(screen.getByText("GALERÍA DE IMÁGENES (2)")).toBeInTheDocument();
  });

  it("renders thumbnails for each image", () => {
    render(<ImageGallery images={mockImages} />);
    const images = screen.getAllByRole("img");
    expect(images.length).toBe(2);
  });

  it("calls onImageClick when thumbnail is clicked", () => {
    const onImageClick = vi.fn();
    render(<ImageGallery images={mockImages} onImageClick={onImageClick} />);
    
    const thumbnails = screen.getAllByRole("img");
    fireEvent.click(thumbnails[0]?.closest("div"));
    
    expect(onImageClick).toHaveBeenCalled();
  });
});

describe("ImageThumbnail Component", () => {
  it("renders thumbnail with correct alt text", () => {
    const onClick = vi.fn();
    render(
      <ImageThumbnail image={mockImages[0]} onClick={onClick} />
    );
    
    const img = screen.getByAltText("foto1.jpg");
    expect(img).toBeInTheDocument();
  });

  it("calls onClick when thumbnail is clicked", () => {
    const onClick = vi.fn();
    render(
      <ImageThumbnail image={mockImages[0]} onClick={onClick} />
    );
    
    // el div con onClick es el ancestro directo del img
    const container = screen.getByAltText("foto1.jpg").closest("div");
    expect(container).not.toBeNull();
    fireEvent.click(container!);
    expect(onClick).toHaveBeenCalled();
  });
});

describe("ImagePreviewModal Component", () => {
  it("does not render when isOpen is false", () => {
    const { container } = render(
      <ImagePreviewModal
        image={mockImages[0]}
        allImages={mockImages}
        isOpen={false}
        onClose={vi.fn()}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it("renders preview when isOpen is true", () => {
    render(
      <ImagePreviewModal
        image={mockImages[0]}
        allImages={mockImages}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    
    expect(screen.getByText("foto1.jpg")).toBeInTheDocument();
  });

  it("shows image counter", () => {
    render(
      <ImagePreviewModal
        image={mockImages[0]}
        allImages={mockImages}
        isOpen={true}
        onClose={vi.fn()}
      />
    );
    
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
  });

  it("navigates to next image when next button is clicked", () => {
    render(
      <ImagePreviewModal
        image={mockImages[0]}
        allImages={mockImages}
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("1 de 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText("2 de 2")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ImagePreviewModal
        image={mockImages[0]}
        allImages={mockImages}
        isOpen={true}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
