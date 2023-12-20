// import terser from "@rollup/plugin-terser";
// import resolve from '@rollup/plugin-node-resolve';
export default {
    input: "src/index.js",
    output: {
        file: "lib/index.js",
        format: "es",
        plugins: [
            // resolve(),
            // terser({
            // 	compress: {
            // 		pure_getters: true,
            // 		unsafe: true,
            // 		unsafe_comps: true,
            // 		warnings: false,
            // 	},
            // }),
        ],
    },
};
