import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";
Config.overrideWebpackConfig(enableTailwind);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// 3D scenes (@remotion/three) need WebGL in the headless render browser.
Config.setChromiumOpenGlRenderer("angle");
