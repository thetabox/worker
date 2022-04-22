import Ffmpeg, { FfprobeData } from 'fluent-ffmpeg'
import { MediaInfo } from '@thetabox/model'
import numbro from 'numbro'
// sudo apt install ffmpeg

export async function getMediaInfo(filePath: string): Promise<FfprobeData> {
	return new Promise((resolve, reject) => {
		Ffmpeg.ffprobe(filePath, function (err, metadata) {
			if (err) {
				console.error(err)
				return reject(new Error(err))
			}

			resolve(metadata as FfprobeData) //?
		})
	})
}

export function mapToMediaInfo(metadata: FfprobeData) {
	const mediaHeader = metadata.streams[0]
	const videoHeader = metadata.streams[1]
	const mediaInfo: MediaInfo = {
		channels: mediaHeader.channels || 0,
		channel_layout: mediaHeader.channel_layout || '',
		duration: numbro(mediaHeader.duration).value() || 0,
		height: videoHeader.height || 0,
		width: videoHeader.width || 0
	}
	return mediaInfo
}
