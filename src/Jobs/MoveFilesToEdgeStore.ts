import { FileEdgeStore, FileHub, JobStatus, Tags } from '@thetabox/model'
import { Db } from '@thetanext/services'
import { Firestore } from '@google-cloud/firestore'
import { FileStatus } from '@thetabox/model'
import fs from 'fs-extra'
import { createBase64, createThumb } from './CreateThumb'
import { getMediaInfo, mapToMediaInfo } from './ExtractMediaInfo'
import { DateHelper, putFile } from '@thetabox/services'
import path from 'path/posix'

const firestore = new Firestore()
const db = new Db(firestore)

export async function startListenForNewFiles() {
	console.log('start listen for new files')
	let collectionRef = firestore.collection('files').where('file_status', '==', FileStatus.New)
	let newFiles: FileHub[] = []

	collectionRef.onSnapshot(
		async (snapshot: any) => {
			newFiles = []
			snapshot.forEach((x: any) => {
				let file = x.data() as FileHub
				file.id = x.id
				newFiles.push(file)
				console.log(file)
			})
			try {
				const storedFiles = await moveNewFiles(newFiles)
				await db.updateAll('files', storedFiles)
				await cleanupFiles(storedFiles)
			} catch (error) {
				console.error(error)
			}
		},
		function (error: any) {
			console.error(`${error.message} during on snapshot`)
		}
	)
}

export async function moveNewFiles(files: FileHub[]) {
	const storedFiles: FileEdgeStore[] = []

	for (const file of files) {
		try {
			const srcDocker = buildDockerPath(file) //?

			await testIfDockerHasPermission(srcDocker)
			const ffProbeData = await getMediaInfo(srcDocker)
			const mediaInfo = mapToMediaInfo(ffProbeData)
			const thumbFullPath = await createThumb(srcDocker, mediaInfo)
			const base64 = await createBase64(thumbFullPath)
			mediaInfo.thumbnail = base64
			const srcHost = buildHostPath(file)
			const edgeStoreFile = await putFile(srcHost)

			if (!edgeStoreFile.success) throw new Error(`${JSON.stringify(file)}`)
			file.file_status = FileStatus.Stored

			const storedFile: FileEdgeStore = {
				...file,
				edgeStore: edgeStoreFile,
				mediaInfo,
				comments: '',
				archive_status: JobStatus._,
				upload_status: JobStatus._,
				create_time: DateHelper.dayInUnix((ffProbeData.format?.tags as Tags).creation_time),
				update_time: DateHelper.dayInUnix(),
				isSupported: isSupported(file.file_name),
			} 
			storedFiles.push(storedFile)
		} catch (error) {
			console.error(error)
			file.file_status = FileStatus.New
			db.update('files', file.id, file)
		}
	}
	return storedFiles
}

export function isSupported(fileName: string) {
	return path.extname(fileName).toLowerCase() === 'mp4'
}

async function testIfDockerHasPermission(src: string) {
	try {
		await fs.access(src, fs.constants.R_OK)
	} catch (error) {
		console.error(error)
		throw error
	}
}

function buildDockerPath(file: FileHub) {
	return `${process.env.UPLOAD_FOLDER}/${file.file_name}`
}

function buildHostPath(file: FileHub) {
	return `/uploads/${file.file_name}`
}

async function cleanupFiles(files: FileHub[]) {
	for (const file of files) {
		try {
			await fs.unlink(buildDockerPath(file))
		} catch (error) {
			console.error(error)
		}
	}
}
