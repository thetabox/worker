import { getStatus } from '@thetabox/services'
import { startListenForNewFiles } from './Jobs/MoveFilesToEdgeStore'
process.env.GOOGLE_APPLICATION_CREDENTIALS = './key.json'

async function start() {
	try {
		const status = await getStatus()
		console.log(JSON.stringify(status))
		startListenForNewFiles()
	} catch (error) {
		console.error(error)
	}
}

start()
