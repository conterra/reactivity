import esbuild from "rollup-plugin-esbuild";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        
    },
    plugins: [
        // for decorators
        esbuild()
    ]
});
