
import React, { useState, useCallback, DragEvent, useRef } from 'react';
import { generatePdf } from './services/pdfService';
import { UploadIcon, FileIcon, CloseIcon, SpinnerIcon, DownloadIcon, EditIcon, ReorderIcon } from './components/Icons';

interface ImageFile {
  file: File;
  previewUrl: string;
}

const ImageUploadArea: React.FC<{ onFilesAdded: (files: File[]) => void }> = ({ onFilesAdded }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesAdded(Array.from(e.target.files));
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      onFilesAdded(imageFiles);
    }
  };

  return (
    <div
      className={`relative w-full max-w-3xl p-8 border-2 border-dashed rounded-xl transition-colors duration-300 ${isDragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300 bg-white'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        multiple
        accept="image/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleFileChange}
      />
      <label htmlFor="file-upload" className="flex flex-col items-center justify-center space-y-4 text-slate-600 cursor-pointer">
        <UploadIcon className="w-16 h-16 text-sky-500" />
        <p className="text-xl font-semibold">
          <span className="text-sky-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-sm text-slate-500">PNG, JPG, GIF, WEBP, etc.</p>
      </label>
    </div>
  );
};

const ImagePreviewCard: React.FC<{ imageFile: ImageFile; onRemove: () => void }> = ({ imageFile, onRemove }) => {
  return (
    <div className="relative group w-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
      <img src={imageFile.previewUrl} alt={imageFile.file.name} className="w-full h-40 object-cover" />
      <div className="p-3">
        <p className="text-sm font-medium text-slate-700 truncate" title={imageFile.file.name}>
          {imageFile.file.name}
        </p>
        <p className="text-xs text-slate-500">{(imageFile.file.size / 1024).toFixed(1)} KB</p>
      </div>
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 p-1.5 bg-white/70 text-slate-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        aria-label="Remove image"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default function App() {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [pdfFilename, setPdfFilename] = useState<string>('converted-images');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOverAddMore, setIsDraggingOverAddMore] = useState(false);

  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    dragItemIndex.current = index;
    document.body.classList.add('dragging');
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (index === dragItemIndex.current) return;
    dragOverItemIndex.current = index;
    e.currentTarget.classList.add('ring-2', 'ring-sky-500', 'ring-offset-2');
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('ring-2', 'ring-sky-500', 'ring-offset-2');
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('ring-2', 'ring-sky-500', 'ring-offset-2');
    if (dragItemIndex.current === null || dragOverItemIndex.current === null || dragItemIndex.current === dragOverItemIndex.current) {
      return;
    }
    const files = [...imageFiles];
    const draggedItem = files.splice(dragItemIndex.current, 1)[0];
    files.splice(dragOverItemIndex.current, 0, draggedItem);
    setImageFiles(files);
  };

  const handleDragEnd = () => {
    document.body.classList.remove('dragging');
    document.querySelectorAll('.ring-2').forEach(el => el.classList.remove('ring-2', 'ring-sky-500', 'ring-offset-2'));
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleFilesAdded = useCallback((files: File[]) => {
    setError(null);
    const newImageFiles = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImageFiles(prev => [...prev, ...newImageFiles]);
  }, []);

  const handleRemoveFile = useCallback((indexToRemove: number) => {
    setImageFiles(prev => {
      const newFiles = prev.filter((_, index) => index !== indexToRemove);
      URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      return newFiles;
    });
  }, []);

  const handleGeneratePdf = async () => {
    if (imageFiles.length === 0) {
      setError('Please add at least one image.');
      return;
    }
    if (!pdfFilename.trim()) {
      setError('Please provide a filename for the PDF.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const filesToProcess = imageFiles.map(imgFile => imgFile.file);
      await generatePdf(filesToProcess, pdfFilename.trim());
    } catch (err) {
      console.error('PDF Generation Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetApp = () => {
    imageFiles.forEach(imgFile => URL.revokeObjectURL(imgFile.previewUrl));
    setImageFiles([]);
    setPdfFilename('converted-images');
    setError(null);
    setIsLoading(false);
  };

  const handleDragEnterAddMore = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAddMore(true);
  };

  const handleDragLeaveAddMore = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAddMore(false);
  };

  const handleDragOverAddMore = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropAddMore = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverAddMore(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      handleFilesAdded(imageFiles);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <style>{`.dragging, .dragging * { cursor: grabbing !important; }`}</style>
      <main className="w-full max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
            Image to PDF Converter
          </h1>
          <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
            Easily convert your images into a single, beautifully formatted PDF file.
          </p>
        </header>

        {imageFiles.length === 0 ? (
          <ImageUploadArea onFilesAdded={handleFilesAdded} />
        ) : (
          <div className="w-full bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 pb-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-800">
                Your Images <span className="text-slate-400 font-medium">({imageFiles.length})</span>
              </h3>
              <p className="text-sm text-slate-500 mt-1 sm:mt-0 flex items-center">
                <ReorderIcon className="w-5 h-5 mr-2 text-slate-400" />
                Drag & drop to reorder images
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {imageFiles.map((imageFile, index) => (
                <div
                  key={imageFile.previewUrl}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                  className="cursor-grab rounded-lg transition-shadow duration-200"
                >
                  <ImagePreviewCard
                    imageFile={imageFile}
                    onRemove={() => handleRemoveFile(index)}
                  />
                </div>
              ))}
               <label
                  htmlFor="file-upload-more"
                  className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDraggingOverAddMore ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50'}`}
                  onDragEnter={handleDragEnterAddMore}
                  onDragLeave={handleDragLeaveAddMore}
                  onDragOver={handleDragOverAddMore}
                  onDrop={handleDropAddMore}
                >
                  <UploadIcon className="w-8 h-8 text-slate-400" />
                  <span className="text-sm text-slate-500 mt-2 text-center">Add more</span>
                   <input
                        id="file-upload-more"
                        type="file"
                        multiple
                        accept="image/*"
                        className="opacity-0 w-0 h-0"
                        onChange={(e) => e.target.files && handleFilesAdded(Array.from(e.target.files))}
                    />
                </label>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">PDF Configuration</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                 <div className="relative w-full sm:w-1/2">
                   <label htmlFor="pdf-filename" className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-slate-700">PDF Filename</label>
                   <div className="flex items-center">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm">
                        <EditIcon className="w-5 h-5" />
                      </span>
                      <input
                        type="text"
                        id="pdf-filename"
                        value={pdfFilename}
                        onChange={(e) => setPdfFilename(e.target.value)}
                        className="block w-full rounded-none rounded-r-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-3"
                        placeholder="e.g., my-photo-album"
                      />
                   </div>
                </div>
                <div className="flex gap-4 w-full sm:w-auto">
                  <button
                    onClick={handleGeneratePdf}
                    disabled={isLoading}
                    className="flex-grow sm:flex-grow-0 w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <SpinnerIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                        Generating...
                      </>
                    ) : (
                       <>
                        <DownloadIcon className="-ml-1 mr-2 h-5 w-5" />
                        Generate PDF
                       </>
                    )}
                  </button>
                   <button
                    onClick={resetApp}
                    className="flex-grow sm:flex-grow-0 w-full inline-flex justify-center items-center px-6 py-3 border border-slate-300 text-base font-medium rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
            {error && <p className="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
