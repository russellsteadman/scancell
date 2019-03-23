export const SerializeImage = async (url) => {
    const canvas = document.createElement('canvas');
    const image = document.createElement('img');
    const ctx = canvas.getContext('2d');

    image.setAttribute('src', url);
    await new Promise((res, rej) => {
        image.addEventListener('load', () => res());
        image.addEventListener('error', () => rej());
    });

    const { height, width } = image;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    return ctx.getImageData(0, 0, width, height);
};

export const CreateCanvas = async ({height, width, data}, canvas) => {
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    let imageData = ctx.createImageData(width, height);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
};

global.lastBlob = global.lastBlob || null;

export const DownloadCanvas = async (canvas) => {
    if (global.lastBlob) {
        try {
            URL.revokeObjectURL(global.lastBlob);
        } catch (e) {}
    }

    return await new Promise((res, rej) => {
        canvas.toBlob((blob) => {
            let download = URL.createObjectURL(blob);
            global.lastBlob = download;
            res(download);
        }, 'image/jpeg', 0.95);
    });
};