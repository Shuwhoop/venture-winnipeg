export const CLIENT_PHOTO_MAX_BYTES =
  3 * 1024 * 1024;

const acceptedTypes =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif"
  ]);

type DrawablePhoto = {
  source:
    | ImageBitmap
    | HTMLImageElement;
  width: number;
  height: number;
  close: () => void;
};

async function loadDrawablePhoto(
  file: File
): Promise<DrawablePhoto> {
  if (
    typeof createImageBitmap ===
    "function"
  ) {
    try {
      const bitmap =
        await createImageBitmap(
          file
        );

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => {
          bitmap.close();
        }
      };
    } catch {
      // Fall through to the regular browser image decoder.
    }
  }

  const sourceUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const element =
            new Image();

          element.onload = () =>
            resolve(element);

          element.onerror = () =>
            reject(
              new Error(
                "This device could not read that photo. Try exporting it as JPEG."
              )
            );

          element.src =
            sourceUrl;
        }
      );

    return {
      source: image,
      width:
        image.naturalWidth,
      height:
        image.naturalHeight,
      close: () => {
        URL.revokeObjectURL(
          sourceUrl
        );
      }
    };
  } catch (error) {
    URL.revokeObjectURL(
      sourceUrl
    );
    throw error;
  }
}

export async function preparePhotoForUpload(
  source: File
): Promise<File> {
  if (!acceptedTypes.has(source.type)) {
    throw new Error(
      "Choose a JPEG, PNG, WebP, or iPhone HEIC photo."
    );
  }

  const drawable =
    await loadDrawablePhoto(
      source
    );

  const maximumSide = 1800;
  const scale = Math.min(
    1,
    maximumSide /
      Math.max(
        drawable.width,
        drawable.height
      )
  );

  const width = Math.max(
    1,
    Math.round(
      drawable.width * scale
    )
  );

  const height = Math.max(
    1,
    Math.round(
      drawable.height * scale
    )
  );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    drawable.close();
    throw new Error(
      "This browser could not prepare the photo."
    );
  }

  context.drawImage(
    drawable.source,
    0,
    0,
    width,
    height
  );

  drawable.close();

  const blob =
    await new Promise<Blob | null>(
      (resolve) => {
        canvas.toBlob(
          resolve,
          "image/jpeg",
          0.84
        );
      }
    );

  if (!blob) {
    throw new Error(
      "The photo could not be prepared."
    );
  }

  if (
    blob.size >
    CLIENT_PHOTO_MAX_BYTES
  ) {
    throw new Error(
      "The prepared photo is still larger than 3 MB. Choose a smaller image."
    );
  }

  const safeBase =
    source.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) ||
    "venture-photo";

  return new File(
    [blob],
    `${safeBase}.jpg`,
    {
      type:
        "image/jpeg",
      lastModified:
        Date.now()
    }
  );
}
