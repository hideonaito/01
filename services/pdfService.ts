// This assumes jsPDF is loaded globally from a CDN script in index.html
declare const jspdf: any;

/**
 * Loads an image from a File object and returns an HTMLImageElement.
 * @param file The image file to load.
 * @returns A promise that resolves with the loaded HTMLImageElement.
 */
const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = e.target.result as string;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
    });
};

/**
 * Generates a PDF from a list of image files.
 * Each image is placed on a separate page with its filename and a page number.
 * @param files An array of File objects (images).
 * @param pdfFilename The desired filename for the output PDF (without extension).
 */
export const generatePdf = async (files: File[], pdfFilename: string): Promise<void> => {
    // Access jsPDF from the window object
    const { jsPDF } = jspdf;
    
    // Create a new jsPDF instance in landscape A4 format
    const doc = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
    });

    const PAGE_WIDTH = doc.internal.pageSize.getWidth();
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
    const MARGIN = 15;
    const FOOTER_HEIGHT = 20;
    
    // Calculate the maximum dimensions for the image to fit on the page with margins
    const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;
    const MAX_HEIGHT = PAGE_HEIGHT - MARGIN * 2 - FOOTER_HEIGHT; // Reserve space for footer

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Add a new page for each image except the first one
        if (i > 0) {
            doc.addPage();
        }

        try {
            const img = await loadImage(file);
            
            const imgRatio = img.width / img.height;
            const maxRatio = MAX_WIDTH / MAX_HEIGHT;

            let imgFinalWidth, imgFinalHeight;

            // Determine final image dimensions to maintain aspect ratio
            if (imgRatio > maxRatio) {
                // Image is wider than the available space ratio
                imgFinalWidth = MAX_WIDTH;
                imgFinalHeight = MAX_WIDTH / imgRatio;
            } else {
                // Image is taller or equal to the available space ratio
                imgFinalHeight = MAX_HEIGHT;
                imgFinalWidth = MAX_HEIGHT * imgRatio;
            }

            // Center the image horizontally and place it at the top margin
            const x = (PAGE_WIDTH - imgFinalWidth) / 2;
            const y = MARGIN;

            doc.addImage(img, 'JPEG', x, y, imgFinalWidth, imgFinalHeight);
            
            // Set font and style for the footer
            doc.setFont('gothic', 'normal');
            doc.setTextColor(100); // Gray color
            doc.setFontSize(10);

            // Add the page number
            const pageNumText = `Page ${i + 1} of ${files.length}`;
            doc.text(pageNumText, PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN, { align: 'center' });


        } catch (error) {
            console.error(`Error processing image ${file.name}:`, error);
            // If an image fails to load, add an error message to that page in the PDF
            doc.setFont('gothic', 'normal');
            doc.setTextColor(255, 0, 0); // Red color for error
            doc.text(`Error: Could not load image "${file.name}"`, MARGIN, MARGIN);
        }
    }

    // Save the generated PDF
    doc.save(`${pdfFilename}.pdf`);
};