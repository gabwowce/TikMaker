import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";
Config.overrideWebpackConfig(enableTailwind);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// A machine whose Chrome is not Remotion's own download (a cloud sandbox):
// REMOTION_BROWSER_EXECUTABLE in the environment points at it.
if (process.env.REMOTION_BROWSER_EXECUTABLE)
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
