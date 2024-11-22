export default {

	async runServer(meshPath){
		const meshArtifacts = await import(meshPath);
		const { getBuiltMesh } = meshArtifacts;

		console.log('Mesh config - ', JSON.stringify(tenantMesh));
	},

	// TODO: Access mesh artifact and run yogaServer
	async fetch(request, env, ctx) {
		await this.runServer(env.meshPath);
		return new Response("Hello World!");
	},
  };
