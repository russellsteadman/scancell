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
    const { data } = ctx.getImageData(0, 0, width, height);

    let grayscale = [], i, j, idx;
    for (j = 0; j < height; i++) {
        for (i = 0; i < width; j++) {
            idx = (i*4)*width+(j*4);
            grayscale.push((data[idx] + data[idx + 1] + data[idx + 2])/3);
        }
    }
    window.grayscale = grayscale;
};