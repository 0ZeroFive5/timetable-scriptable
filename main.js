class Cache {
  constructor(name) {
    this.fm = FileManager.iCloud();
    this.cachePath = this.fm.joinPath(this.fm.documentsDirectory(), name);

    if (!this.fm.fileExists(this.cachePath)) {
      this.fm.createDirectory(this.cachePath);
    }
  }

  async read(key) {
    try {
      const path = this.fm.joinPath(this.cachePath, key);
      await this.fm.downloadFileFromiCloud(path);
      const value = this.fm.readString(path);
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  write(key, value) {
    const path = this.fm.joinPath(this.cachePath, key.replace("/", "-"));
    console.log(`Caching to ${path}...`);
    this.fm.writeString(path, JSON.stringify(value));
  }
}

const toTitleCase = (phrase) =>
  phrase
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

async function main(settings) {
  const background = new LinearGradient();
  background.startPoint = new Point(0, 0);
  background.endPoint = new Point(1, 1);
  background.locations = [-1, 2];
  background.colors = settings.background;

  const app = new ListWidget();
  app.url = "https://vloapp.pl";
  app.backgroundGradient = background;

  const appStack = app.addStack();

  let currentLessonStack;

  if (config.widgetFamily === "medium" || config.widgetFamily === "large") {
    currentLessonStack = appStack.addStack();
    currentLessonStack.size = new Size(175, 0);
    currentLessonStack.setPadding(8, 8, 8, 8);
    currentLessonStack.layoutVertically();
  }

  const list = appStack.addStack();
  list.layoutVertically();
  list.setPadding(5, 5, 0, 5);

  const cache = new Cache("timetableCache");

  let today = await cache.read("today");
  const date = new Date();

  try {
    const req = new Request(`https://timetable-api.vloapp.pl/?offset=${settings.offset || 0}`);
    const res = await req.loadJSON();
    const t = res[date.getDay() - 1];

    if (!today) {
      today = t;
    }

    if (t) {
      cache.write("today", t);
    }
  } catch (e) {
    console.log(e);
  }
  
  console.log(today);

  let count = 0;

  today.forEach((lesson) => {
    if (config.widgetFamily === "medium" && count > 3) return;
    else if (config.widgetFamily === "large" && count > 6) return;
    else if ((!config.widgetFamily || config.widgetFamily === "small") && count > 2) return;

    if (lesson.name === "Religia") return;

    if (
      lesson.distribution &&
      !(
        lesson.distribution.shortcut === settings.wf ||
        lesson.distribution.shortcut === settings.lang ||
        lesson.distribution.shortcut === settings.angInf
      )
    )
      return;

    const parseTime = (i) =>
      lesson.time
        .split(" - ")
        [i].split(":")
        .map((n) => +n);

    const rawTime = [parseTime(0), parseTime(1)];

    const startTime = new Date(date);
    startTime.setHours(rawTime[0][0]);
    startTime.setMinutes(rawTime[0][1]);

    const endTime = new Date(date);
    endTime.setHours(rawTime[1][0]);
    endTime.setMinutes(rawTime[1][1]);

    if (date.getHours() > endTime.getHours()) return;
    if (date.getHours() === endTime.getHours() && date.getMinutes() > endTime.getMinutes()) return;

    if ((config.widgetFamily === "medium" || config.widgetFamily === "large") && count === 0) {
      let wsubtitle = currentLessonStack.addText(lesson.time);
      wsubtitle.font = Font.mediumSystemFont(12);
      wsubtitle.textOpacity = 0.8;
      wsubtitle.textColor = settings.textColor;
      currentLessonStack.addSpacer(2);

      let wtitle = currentLessonStack.addText(lesson.name);
      wtitle.font = Font.blackSystemFont(16);
      wtitle.textColor = settings.textColor;
      wtitle.lineLimit = 1;
      currentLessonStack.addSpacer(4);

      let teacher = currentLessonStack.addText(toTitleCase(lesson.teacher.displayName));
      teacher.font = Font.boldSystemFont(12);
      teacher.textColor = settings.textColor;
      teacher.lineLimit = 1;
      currentLessonStack.addSpacer(6);

      let room = currentLessonStack.addStack();
      room.size = new Size(0, 25);
      room.setPadding(2.5, 5, 2.5, 5);
      room.centerAlignContent();
      room.cornerRadius = 10;
      
      if (lesson.room) {
        room.backgroundColor = settings.boxColor || new Color("#fff", 0.125);
      
        let roomText = room.addText(lesson.room.code);
        roomText.font = Font.boldSystemFont(12);
        roomText.textOpacity = 0.8;
        roomText.textColor = settings.textColor;
      }

      let btnStack = currentLessonStack.addStack();
      btnStack.setPadding(25, 0, 0, 0);

      const fakeBtn = btnStack.addText("View all →");
      fakeBtn.font = Font.blackSystemFont(14);
      fakeBtn.textColor = settings.textColor;
      fakeBtn.textOpacity = 0.7;
      fakeBtn.lineLimit = 1;

      if (config.widgetFamily === "large") {
        currentLessonStack.addSpacer(25);
        const text = currentLessonStack.addText("Buy an iPhone.");
        text.font = Font.blackSystemFont(16);
        text.textColor = settings.textColor;
        text.textOpacity = 0.05;
        text.lineLimit = 1;
      }

      count++;
      return;
    }

    const lessonStack = list.addStack();
    lessonStack.size = new Size(135, 0);
    lessonStack.backgroundColor = settings.boxColor || new Color("#fff", startTime <= date && date <= endTime ? 0.25 : 0.125);
    lessonStack.cornerRadius = 10;
    lessonStack.setPadding(-1, 10, 0, 5);
    lessonStack.layoutHorizontally();
    lessonStack.centerAlignContent();

    const stack = lessonStack.addStack();
    stack.size = new Size(105, 0);
    stack.layoutVertically();
    stack.centerAlignContent();
    
    let wstack;
    
    if (settings.reversedOrder) {
       wstack = stack.addStack();
      wstack.setPadding(5, 0, 0, 0);
    }
    

    let rstack;
    
    if (!settings.roomPipe) {
      rstack = lessonStack.addStack();
    rstack.setPadding(1, 0, 0, 0);
    rstack.size = new Size(20, 0);
    stack.addSpacer(5);
    }         
                    
    if (settings.roomPipe && lesson.room) {
      let wsubtitle = stack.addStack();
      
      let t = wsubtitle.addText(lesson.time);
    t.font = Font.mediumSystemFont(12);
    t.textOpacity = 0.8;
    t.textColor = settings.textColor;
    
    let pipe = wsubtitle.addText(settings.pipeText || " | ");
    pipe.font = Font.mediumSystemFont(12);
    pipe.textOpacity = 0.4;
    pipe.textColor = settings.textColor;
    
    let t2 = wsubtitle.addText(lesson.room.code);
    t2.font = Font.mediumSystemFont(12);
    t2.textOpacity = 0.8;
    t2.textColor = settings.textColor;
    
    } else {
      
    let wsubtitle = stack.addText(lesson.time);
    wsubtitle.font = Font.mediumSystemFont(12);
    wsubtitle.textOpacity = 0.8;
    wsubtitle.textColor = settings.textColor;
  }

    
    if (!settings.reversedOrder) {
       wstack = stack.addStack();
      wstack.setPadding(0, 0, 5, 0);
    }
    

    if (lesson.change && lesson.change.change.type === 2) {
      try {
        lesson.name = lesson.change.subject.name;
      } catch (e) {}

      let icon = wstack.addText("⇄ ");
      icon.font = Font.boldSystemFont(13);
      icon.textOpacity = 0.8;
      icon.textColor = settings.textColor;
    }

    if (lesson.change && lesson.change.change.type === 1) {
      let icon = wstack.addText("× ");
      icon.font = Font.boldSystemFont(13);
      icon.textOpacity = 0.8;
      icon.textColor = settings.textColor;
    }

    let wtitle = wstack.addText(lesson.name);
    wtitle.font = Font.boldSystemFont(13);
    wtitle.textOpacity = 1;
    wtitle.textColor = settings.textColor;
    wtitle.lineLimit = 1;

    if (!settings.roomPipe && lesson.room) {
      let room = rstack.addText(lesson.room.code);
      room.font = Font.boldSystemFont(12);
      room.textOpacity = 0.4;
      room.textColor = settings.textColor;
    }

    count++;
    list.addSpacer(6);
  });

  if (count === 0) {
    if (config.widgetFamily === "medium" || config.widgetFamily === "large") {
      currentLessonStack.size = new Size(1, 1);
      currentLessonStack.setPadding(0, 0, 0, 0);
    }
    // let i = list.addText("×");
    // i.textColor = settings.textColor;
    // i.font = Font.lightSystemFont(48);
    // i.textOpacity = 0.5;
    // i.centerAlignText();
    let t = list.addText("There are no lessons");
    t.textColor = settings.textColor;
    t.font = Font.boldSystemFont(12);
    t.centerAlignText();
//     list.setPadding(0, 0, 12, 0);
  }

  settings.dev && config.runsInWidget ? Script.setWidget(app) : await app.presentMedium();
  Script.complete();
}

module.exports = { main };
