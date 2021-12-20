import fs from 'fs-extra';
import less from 'less';
import path from 'path';
import {getDestDir, PLATFORM} from './paths.js';
import reload from './reload.js';
import {createTask} from './task.js';

function getLessFiles({debug}) {
    const dir = getDestDir({debug, platform: PLATFORM.CHROME});
    return {
        'src/ui/devtools/style.less': `${dir}/ui/devtools/style.css`,
        'src/ui/popup/style.less': `${dir}/ui/popup/style.css`,
        'src/ui/stylesheet-editor/style.less': `${dir}/ui/stylesheet-editor/style.css`,
    };
}

async function bundleCSSEntry({src, dest}) {
    const srcDir = path.join(process.cwd(), path.dirname(src));
    const input = await fs.readFile(src, {encoding: 'utf8'});
    const output = await less.render(input, {paths: [srcDir], math: 'always'});
    const {css} = output;
    await fs.outputFile(dest, css, {encoding: 'utf8'});
}

async function bundleCSS({debug}) {
    const files = getLessFiles({debug});
    for (const [src, dest] of Object.entries(files)) {
        await bundleCSSEntry({src, dest});
    }
    const dir = getDestDir({debug, platform: PLATFORM.CHROME});
    const firefoxDir = getDestDir({debug, platform: PLATFORM.FIREFOX});
    const mv3Dir = getDestDir({debug, platform: PLATFORM.CHROME_MV3});
    const thunderBirdDir = getDestDir({debug, platform: PLATFORM.THUNDERBIRD});
    for (const dest of Object.values(files)) {
        const ffDest = `${firefoxDir}/${dest.substring(dir.length + 1)}`;
        const tbDest = `${thunderBirdDir}/${dest.substring(dir.length + 1)}`;
        const mv3Dest = `${mv3Dir}/${dest.substring(dir.length + 1)}`;
        await fs.copy(dest, ffDest);
        await fs.copy(dest, mv3Dest);
        await fs.copy(dest, tbDest);
    }
}

export default createTask(
    'bundle-css',
    bundleCSS,
).addWatcher(
    ['src/**/*.less'],
    async () => {
        await bundleCSS({debug: true});
        reload({type: reload.CSS});
    },
);
