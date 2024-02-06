const { exec } = require("child_process");

exec("tsc --declaration", (error, stdout, stderr) => {
	console.log(stdout);
	console.log(stderr);
	if (error !== null) {
		console.log(`exec error: ${error}`);
		return;
	}
	exec("sh typeGenerate.sh", (error, stdout, stderr) => {
		console.log(stdout);
		console.log(stderr);
		if (error !== null) {
			console.log(`exec error: ${error}`);
			return;
		}
	});
});
