export const listingImageMaxFiles = 10;
export const listingImageMaxFileSizeBytes = 150 * 1024 * 1024;

export const listingImageMaxFilesMessage = `Maksimum ${listingImageMaxFiles} şəkil əlavə edə bilərsiniz.`;
export const listingImageMaxFileSizeMessage = "Hər şəkilin ölçüsü maksimum 150 MB ola bilər.";

export function getListingImageLimitHint() {
  return `${listingImageMaxFilesMessage} ${listingImageMaxFileSizeMessage}`;
}
