/*
 * image-loader.worker.js
 */

self.addEventListener('message', async event => {
    console.log('Worker: Message reçu du thread principal')
    const imageURL = event.data

    const response = await fetch(imageURL)
    const blob = await response.blob()

    // Send the image data to the UI thread!
    self.postMessage({
        imageURL: imageURL,
        blob: blob,
    })
    console.log('Worker: Message envoyé au thread principal')
})