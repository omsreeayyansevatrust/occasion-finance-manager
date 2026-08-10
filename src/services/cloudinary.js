const CLOUDINARY_CLOUD_NAME = "etejpids";
const CLOUDINARY_UPLOAD_PRESET = "Occasionfinancemanager";

export async function uploadImageToCloudinary(
  asset,
  folder = "occasionfinancemanager/people"
) {
  if (!asset) {
    throw new Error("No image selected.");
  }

  const formData = new FormData();

  formData.append(
    "upload_preset",
    CLOUDINARY_UPLOAD_PRESET
  );

  formData.append(
    "folder",
    folder
  );

  if (
    typeof window !== "undefined" &&
    asset.file
  ) {
    // WEB
    formData.append(
      "file",
      asset.file
    );
  } else {
    // ANDROID / IOS
    const uri = asset.uri;

    const fileName =
      asset.fileName ||
      `person-${Date.now()}.jpg`;

    const mimeType =
      asset.mimeType ||
      "image/jpeg";

    formData.append(
      "file",
      {
        uri,
        name: fileName,
        type: mimeType,
      }
    );
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result =
    await response.json();

  if (!response.ok) {
    console.log(
      "Cloudinary upload error:",
      result
    );

    throw new Error(
      result?.error?.message ||
        "Unable to upload image."
    );
  }

  return {
    url:
      result.secure_url ||
      result.url,
    publicId:
      result.public_id,
  };
}