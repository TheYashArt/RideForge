import {existsSync,writeFileSync} from 'node:fs';
if(!existsSync('assets/fonts/times.ttf'))throw Error('Place your licensed Times New Roman regular font at assets/fonts/times.ttf first.');
writeFileSync('src/loadFont.ts',"import {loadAsync} from 'expo-font';\nexport const loadFont=()=>loadAsync({TimesNewRoman:require('../assets/fonts/times.ttf')});\n");
console.log('Times New Roman configured. Restart Metro and rebuild.');
