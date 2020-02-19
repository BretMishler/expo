// runtime polyfills
import 'core-js/es/string/match-all';

import { projectConfig } from '@react-native-community/cli-platform-android';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

import { ResizeMode } from './constants';
import {
  writeOrReplaceOrInsertInFile,
  writeToFile,
  replaceOrInsertInFile,
  insertToFile,
  insertToFileBeforeLastOccurrence,
  COMMENTS,
} from './file-helpers';

const FILENAMES = {
  SPLASH_SCREEN_DRAWABLE: 'splashscreen_image.png',
};
const DRAWABLES_CONFIGS = {
  default: {
    path: `./res/drawable/${FILENAMES.SPLASH_SCREEN_DRAWABLE}`,
    dimensionsMultiplier: 1,
  },
  mdpi: {
    path: `./res/drawable-mdpi/${FILENAMES.SPLASH_SCREEN_DRAWABLE}`,
    dimensionsMultiplier: 1,
  },
  hdpi: {
    path: `./res/drawable-hdpi/${FILENAMES.SPLASH_SCREEN_DRAWABLE}`,
    dimensionsMultiplier: 1.5,
  },
  xhdpi: {
    path: `./res/drawable-xhdpi/${FILENAMES.SPLASH_SCREEN_DRAWABLE}`,
    dimensionsMultiplier: 2,
  },
  xxhdpi: {
    path: `./res/drawable-xxhdpi/${FILENAMES.SPLASH_SCREEN_DRAWABLE}`,
    dimensionsMultiplier: 3,
  },
  xxxhdpi: {
    path: `./res/drawable-xxxhdpi/${FILENAMES.SPLASH_SCREEN_DRAWABLE}`,
    dimensionsMultiplier: 4,
  },
};
const FILES_PATHS = {
  DRAWABLE_DIRECTORY: './res/drawable',
  SPLASH_SCREEN_DRAWABLE: `./res/drawable/${FILENAMES.SPLASH_SCREEN_DRAWABLE}`,
  SPLASH_SCREEN_COLORS: './res/drawable/colors_splashscreen.xml',
  SPLASH_SCREEN_XML: './res/drawable/splashscreen.xml',
  STYLES: './res/values/styles_splashscreen.xml',
  ANDROID_MANIFEST: './AndroidManifest.xml',
}

/**
 * Deletes all previous splash_screen_images and copies new one to desired drawable directory.
 * If path isn't provided then no new image is placed in drawable directories.
 * @see https://developer.android.com/training/multiscreen/screendensities
 */
async function configureSplashScreenDrawables(
  androidMainPath: string,
  splashScreenImagePath?: string
) {
  await Promise.all(
    Object.values(DRAWABLES_CONFIGS).map(async ({ path }) => {
      if (await fs.pathExists(path)) {
        await fs.remove(path);
      }
    })
  );

  if (splashScreenImagePath) {
    if (!(await fs.pathExists(path.resolve(androidMainPath, FILES_PATHS.DRAWABLE_DIRECTORY)))) {
      await fs.mkdir(path.resolve(androidMainPath, FILES_PATHS.DRAWABLE_DIRECTORY));
    }
    await fs.copyFile(
      splashScreenImagePath,
      path.resolve(androidMainPath, FILES_PATHS.SPLASH_SCREEN_DRAWABLE)
    );
  }
}

async function configureColorsXML(androidMainPath: string, splashScreenBackgroundColor: string) {
  await writeOrReplaceOrInsertInFile(
    path.resolve(androidMainPath, FILES_PATHS.SPLASH_SCREEN_COLORS),
    {
      fileContent: `${COMMENTS.wrapXML(COMMENTS.FILE_TOP)}
<resources>
<color name="splashscreen_background">${splashScreenBackgroundColor}</color> ${COMMENTS.wrapXML(
        COMMENTS.LINE
      )}
</resources>
  `,
      replaceContent: `  <color name="splashscreen_background">${splashScreenBackgroundColor}</color> ${COMMENTS.wrapXML(
        COMMENTS.LINE
      )}}\n`,
      replacePattern: /(?<=(?<openingTagLine>^.*?<resources>.*?$\n)(?<beforeLines>(?<beforeLine>^.*$\n)*?))(?<colorLine>^.*?(?<color><color name="splashscreen_background">.*<\/color>).*$\n)(?=(?<linesAfter>(?<afterLine>^.*$\n)*?)(?<closingTagLine>^.*?<\/resources>.*?$\n))/m,

      insertContent: `  <color name="splashscreen_background">${splashScreenBackgroundColor}</color> ${COMMENTS.wrapXML(
        COMMENTS.LINE
      )}}\n`,
      insertPattern: /^(.*?)<\/resources>(.*?)$/m,
    }
  );
}

async function configureDrawableXML(androidMainPath: string, resizeMode: ResizeMode) {
  const nativeSplashScreen: string =
    resizeMode !== ResizeMode.NATIVE
      ? ''
      : `

  <item>
    <bitmap
      android:gravity="center"
      android:src="@drawable/splashscreen_image"
    />
  </item>`;

  await writeToFile(
    path.resolve(androidMainPath, FILES_PATHS.SPLASH_SCREEN_XML),
    `${COMMENTS.wrapXML(COMMENTS.FILE_TOP_NO_MODIFY)}
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:drawable="@color/splashscreen_background"/>${nativeSplashScreen}
</layer-list>
`
  );
}

async function configureStylesXML(androidMainPath: string) {
  await writeOrReplaceOrInsertInFile(path.resolve(androidMainPath, FILES_PATHS.STYLES), {
    fileContent: `${COMMENTS.wrapXML(COMMENTS.FILE_TOP)}
<resources>
  <style name="Theme.App.SplashScreen" parent="Theme.AppCompat.Light.NoActionBar"> ${COMMENTS.wrapXML(
    COMMENTS.LINE
  )}
    <item name="android:windowBackground">@drawable/splashscreen</item>  ${COMMENTS.wrapXML(
      COMMENTS.LINE
    )}
    <item name="android:windowDrawsSystemBarBackgrounds">true</item> <!-- Tells the system that the app would take care of drawing background for StatusBar -->
    <item name="android:statusBarColor">@android:color/transparent</item> <!-- Make StatusBar transparent by default -->
  </style>
</resources>
`,
    replaceContent: `    <item name="android:windowBackground">@drawable/splashscreen</item>  ${COMMENTS.wrapXML(
      COMMENTS.LINE
    )}\n`,
    replacePattern: /(?<=(?<styleNameLine>^.*?(?<styleName><style name="Theme\.App\.SplashScreen" parent=".*?">).*?$\n)(?<linesBeforeWindowBackgroundLine>(?<singleBeforeLine>^.*$\n)*?))(?<windowBackgroundLine>^.*?(?<windowBackground><item name="android:windowBackground">.*<\/item>).*$\n)(?=(?<linesAfterWindowBackgroundLine>(?<singleAfterLine>^.*$\n)*?)(?<closingTagLine>^.*?<\/style>.*?$\n))/m,

    insertContent: `  <style name="Theme.App.SplashScreen" parent="Theme.AppCompat.Light.NoActionBar">  ${COMMENTS.wrapXML(
      COMMENTS.LINE
    )}
    <item name="android:windowBackground">@drawable/splashscreen</item>  ${COMMENTS.wrapXML(
      COMMENTS.LINE
    )}
  </style>
`,
    insertPattern: /^(.*?)<\/resources>(.*?)$/m,
  });
}

async function configureAndroidManifestXML(androidMainPath: string) {
  const androidManifestPath = path.resolve(androidMainPath, FILES_PATHS.ANDROID_MANIFEST);

  const r1 = await replaceOrInsertInFile(androidManifestPath, {
    replaceContent: `android:theme="@style/Theme.App.SplashScreen"`,
    replacePattern: /(?<nameBeforeTheme>(?<=(?<application1>^.*?<application(.*|\n)*?)(?<activity1>^.*?<activity(.|\n)*?android:name="\.MainActivity"(.|\n)*?))(?<androidTheme1>android:theme=".*?"\s*?))|((?<=(?<application2>^.*?<application(.|\n)*?)(?<activity2>^.*?<activity(.|\n)*?))(?<androidTheme2>android:theme=".*?"\s*?)(?=((.|\n)*?android:name="\.MainActivity"(.|\n)*?)))/m,

    insertContent: `\n      android:theme="@style/Theme.App.SplashScreen"`,
    insertPattern: /(?<=(?<application>^.*?<application(.*|\n)*?)(?<activity>^.*?<activity))(?<activityAttributes>(.|\n)*?android:name="\.MainActivity"(.|\n)*?>)/m,
  });

  const r2 = await replaceOrInsertInFile(androidManifestPath, {
    replaceContent: `\n\n    ${COMMENTS.wrapXML(COMMENTS.ANDROID_MANIFEST)}\n`,
    replacePattern: RegExp(
      `(?<=(?<application>^.*?<application(.|\n)*?))([\n\t ])*(?<comment>${COMMENTS.wrapXML(
        COMMENTS.ANDROID_MANIFEST
      ).replace(
        /[-/\\^$*+?.()|[\]{}]/g,
        '\\$&' // eslint-disable-next-line no-useless-escape
      )})([\n\t ])*(?=(?<activity>(^.*?<activity)(.|\n)*?android:name="\.MainActivity"(.|\n)*?>))`,
      'm'
    ),

    insertContent: `\n    ${COMMENTS.wrapXML(COMMENTS.ANDROID_MANIFEST)}\n`,
    insertPattern: /(?<=(?<application>^.*?<application(.|\n)*?))(?<activity>(^.*?<activity)(.|\n)*?android:name="\.MainActivity"(.|\n)*?>)/m,
  });

  if (!r1.inserted && !r1.replaced && !r2.inserted && r2.replaced) {
    console.log(
      chalk.yellow(
        `${chalk.magenta(
          'AndroidManifest.xml'
        )} does not contain <activity /> entry for ${chalk.magenta(
          'MainActivity'
        )}. SplashScreen style will not be applied.`
      )
    );
  }
}

/**
 * Injects specific code to MainApplication that would trigger SplashScreen mounting process.
 */
async function configureShowingSplashScreen(projectRootPath: string, resizeMode: ResizeMode) {
  // eslint-disable-next-line
  const mainApplicationPath = projectConfig(projectRootPath)?.mainFilePath;

  if (!mainApplicationPath) {
    console.log(chalk.red(`Failed to configure 'MainActivity'.`));
    return;
  }

  const mainActivityPathJava = path.resolve(mainApplicationPath, '../MainActivity.java');
  const mainActivityPathKotlin = path.resolve(mainApplicationPath, '../MainActivity.kt');

  const isJava = await fs.pathExists(mainActivityPathJava);
  const isKotlin = !isJava && (await fs.pathExists(mainActivityPathKotlin));

  if (isJava) {
    // handle imports
    await replaceOrInsertInFile(mainActivityPathJava, {
      replacePattern: /^import expo\.modules\.splashscreen\.SplashScreen;.*?\nimport expo\.modules\.splashscreen\.SplashScreenImageResizeMode;.*?$/m,
      replaceContent: `import expo.modules.splashscreen.SplashScreen;\nimport expo.modules.splashscreen.SplashScreenImageResizeMode;`,
      insertPattern: /(?=public class .* extends .* {.*$)/m,
      insertContent: `import expo.modules.splashscreen.SplashScreen;\nimport expo.modules.splashscreen.SplashScreenImageResizeMode;\n\n`,
    });
    await replaceOrInsertInFile(mainActivityPathJava, {
      replacePattern: /^import com\.facebook\.react\.ReactRootView;.*?$/m,
      replaceContent: `import com.facebook.react.ReactRootView;`,
      insertPattern: /(?<=import com\.facebook\.react\.ReactActivity;.*?$)/m,
      insertContent: `\nimport com.facebook.react.ReactRootView;`,
    });

    // handle onCreate
    const r = await replaceOrInsertInFile(mainActivityPathJava, {
      replacePattern: /(?<=super\.onCreate(.|\n)*?)SplashScreen\.show\(this, SplashScreenImageResizeMode\..*\);.*$/m, // super.onCreate has to be called first
      replaceContent: `SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView.class); ${COMMENTS.wrapJavaKotlin(
        COMMENTS.LINE
      )}`,
      insertPattern: /(?<=^.*super\.onCreate.*$)/m, // insert just below super.onCreate
      insertContent: `\n    // SplashScreen.show(...) has to called after super.onCreate(...)\n    SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView.class); ${COMMENTS.wrapJavaKotlin(
        COMMENTS.LINE
      )}`,
    });

    let onCreateInserted = false;
    if (!r.replaced && !r.inserted) {
      // handle if sth went wrong
      // no previously defined onCreate -> insert basic one
      onCreateInserted = await insertToFile(mainActivityPathJava, {
        insertPattern: /(?<=public class .* extends .* {.*$)/m,
        insertContent: `\n
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // SplashScreen.show(...) has to called after super.onCreate(...)
    SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView.class); ${COMMENTS.wrapJavaKotlin(
          COMMENTS.LINE
        )}
  }\n`,
      });
      // with additional bundle import at the top
      await replaceOrInsertInFile(mainActivityPathJava, {
        replacePattern: /import android\.os\.Bundle;/m,
        replaceContent: 'import android.os.Bundle;',
        insertPattern: /(?<=(^.*?package .*?$))/m,
        insertContent: `\n\nimport android.os.Bundle;`,
      });
    }

    // check if SplashScreen.show() is added for the first time
    // if so - proceed with inserting handling transparent & translucent StatusBar
    if (r.inserted || onCreateInserted) {
      // insert import
      await insertToFile(mainActivityPathJava, {
        insertPattern: /(?<=(^.*?import\s*android\.os\.Bundle;.*?$))/m,
        insertContent: '\nimport android.view.WindowInsets;',
      });
      // insert method call - just below SplashScreen.show(...)
      await insertToFile(mainActivityPathJava, {
        insertPattern: /(?<=SplashScreen\.show\(this, SplashScreenImageResizeMode\..*\);.*$)/m,
        insertContent: `\n    // StatusBar transparency & translucency that would work with RN has to be pragmatically configured.\n    this.allowDrawingBeneathStatusBar();`,
      });
      // insert method body as the last method in class
      await insertToFileBeforeLastOccurrence(mainActivityPathJava, {
        insertPattern: /^\s*}\s*$/gm,
        insertContent: `
  private void allowDrawingBeneathStatusBar() {
    // Hook into the window insets calculations and consume all the top insets so no padding will be added under the status bar.
    // This approach goes in pair with ReactNative's StatusBar module's approach.
    getWindow().getDecorView().setOnApplyWindowInsetsListener(
        (v, insets) -> {
          WindowInsets defaultInsets = v.onApplyWindowInsets(insets);
          return defaultInsets.replaceSystemWindowInsets(
              defaultInsets.getSystemWindowInsetLeft(),
              0,
              defaultInsets.getSystemWindowInsetRight(),
              defaultInsets.getSystemWindowInsetBottom());
        });
  }\n`,
      });
    }

    return;
  }

  if (isKotlin) {
    // handle imports
    await replaceOrInsertInFile(mainActivityPathKotlin, {
      replacePattern: /^import expo\.modules\.splashscreen\.SplashScreen.*?\nimport expo\.modules\.splashscreen\.SplashScreenImageResizeMode.*?$/m,
      replaceContent: `import expo.modules.splashscreen.SplashScreen\nimport expo.modules.splashscreen.SplashScreenImageResizeMode`,
      insertPattern: /(?=class .* : .* {.*$)/m,
      insertContent: `import expo.modules.splashscreen.SplashScreen\nimport expo.modules.splashscreen.SplashScreenImageResizeMode\n\n`,
    });
    await replaceOrInsertInFile(mainActivityPathKotlin, {
      replacePattern: /^import com\.facebook\.react\.ReactRootView.*?$/m,
      replaceContent: `import com.facebook.react.ReactRootView`,
      insertPattern: /(?<=import com\.facebook\.react\.ReactActivity.*?$)/m,
      insertContent: `\nimport com.facebook.react.ReactRootView`,
    });

    // handle onCreate
    const r = await replaceOrInsertInFile(mainActivityPathKotlin, {
      replacePattern: /(?<=super\.onCreate(.|\n)*?)SplashScreen\.show\(this, SplashScreenImageResizeMode\..*\).*$/m, // super.onCreate has to be called first
      replaceContent: `SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView::class.java) ${COMMENTS.wrapJavaKotlin(
        COMMENTS.LINE
      )}`,
      insertPattern: /(?<=^.*super\.onCreate.*$)/m, // insert just below super.onCreate
      insertContent: `\n    // SplashScreen.show(...) has to called after super.onCreate(...)\n    SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView::class.java) ${COMMENTS.wrapJavaKotlin(
        COMMENTS.LINE
      )}`,
    });

    let onCreateInserted = false;
    if (!r.replaced && !r.inserted) {
      // handle if sth went wrong
      // no previously defined onCreate -> insert basic one
      onCreateInserted = await insertToFile(mainActivityPathKotlin, {
        insertPattern: /(?<=class .* : .* {.*$)/m,
        insertContent: `\n
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // SplashScreen.show(...) has to called after super.onCreate(...)
    SplashScreen.show(this, SplashScreenImageResizeMode.${resizeMode.toUpperCase()}, ReactRootView::class.java) ${COMMENTS.wrapJavaKotlin(
          COMMENTS.LINE
        )}
  }\n`,
      });
      // with additional bundle import at the top
      await replaceOrInsertInFile(mainActivityPathKotlin, {
        replacePattern: /import android\.os\.Bundle/m,
        replaceContent: 'import android.os.Bundle',
        insertPattern: /(?<=(^.*?package .*?$))/m,
        insertContent: `\n\nimport android.os.Bundle`,
      });
    }

    // check if SplashScreen.show() is added for the first time
    // if so - proceed with inserting handling transparent & translucent StatusBar
    if (r.inserted || onCreateInserted) {
      // insert method call - just below SplashScreen.show(...)
      await insertToFile(mainActivityPathKotlin, {
        insertPattern: /(?<=SplashScreen\.show\(this, SplashScreenImageResizeMode\..*\).*$)/m,
        insertContent: `\n    // StatusBar transparency & translucency that would work with RN has to be pragmatically configured.\n    this.allowDrawingBeneathStatusBar()`,
      });
      // insert method body as the last method in class
      await insertToFileBeforeLastOccurrence(mainActivityPathKotlin, {
        insertPattern: /^\s*}\s*$/gm,
        insertContent: `
  private fun allowDrawingBeneathStatusBar() {
    // Hook into the window insets calculations and consume all the top insets so no padding will be added under the status bar.
    // This approach goes in pair with ReactNative's StatusBar module's approach.
    window.decorView.setOnApplyWindowInsetsListener { v, insets ->
      v.onApplyWindowInsets(insets).let {
        it.replaceSystemWindowInsets(
          it.systemWindowInsetLeft, 
          0,
          it.systemWindowInsetRight,
          it.systemWindowInsetBottom
        )
      }
    }
  }\n`,
      });
    }

    return;
  }

  console.log(chalk.red(`Failed to configure 'MainActivity'.`));
}

export default async function configureAndroidSplashScreen({
  imagePath,
  resizeMode,
  backgroundColor,
}: {
  imagePath?: string;
  resizeMode: ResizeMode;
  backgroundColor: string;
}) {
  const projectRootPath = path.resolve();
  const androidMainPath = path.resolve(projectRootPath, 'android/app/src/main');

  return Promise.all([
    configureSplashScreenDrawables(androidMainPath, imagePath),
    configureColorsXML(androidMainPath, backgroundColor),
    configureDrawableXML(androidMainPath, resizeMode),
    configureStylesXML(androidMainPath),
    configureAndroidManifestXML(androidMainPath),
    configureShowingSplashScreen(projectRootPath, resizeMode),
  ]).then(() => {});
}
