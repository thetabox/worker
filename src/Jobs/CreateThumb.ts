import { MediaInfo } from '@thetabox/model'
import Ffmpeg from 'fluent-ffmpeg'
import numbro from 'numbro'
import path from 'path'
import fs from 'fs-extra'
// sudo apt install ffmpeg

export async function createThumb(filePath: string, mediaInfo: MediaInfo): Promise<string> {
	const ratio = mediaInfo.width / mediaInfo.height //?
	const width = 48
	const size = `${width}x${numbro(width * ratio).format({ mantissa: 0 })}` //?

	const fileName = path.basename(filePath, path.extname(filePath))
	const thumbName = `${fileName}.png`
	const thumbFolder = process.env.UPLOAD_FOLDER //?
	const thumbFullPath = `${thumbFolder}/${thumbName}`

	return new Promise((resolve, reject): any => {
		Ffmpeg(filePath)
			.on('end', function () {
				resolve(thumbFullPath)
			})
			.on('error', function (err) {
				err //?
				return reject(new Error(err))
			})
			.takeScreenshots(
				{
					count: 1,
					filename: thumbName,
					size: size,
				},
				thumbFolder
			)
	})
}

export async function createBase64(filePath: string) {
	return await fs.readFile(filePath, 'base64') //?
}
