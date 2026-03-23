const { test, expect } = require("@playwright/test");
const HUMAN_STAMP_PATTERN =
  /^Marcos - (ahora|hace \d+ segundos|hace \d+ minutos|hace \d+ horas|ayer|\d{4}\/\d{2}\/\d{2} \d{2}:\d{2})$/;

function getNote(page, index = 0) {
  return page.getByTestId("note").nth(index);
}

function getBlock(note, index = 0) {
  return note.getByTestId("block-text").nth(index);
}

function flattenBlocks(blocks, depth = 0, output = []) {
  for (const block of blocks) {
    output.push({
      id: block.id,
      type: block.type,
      text: block.text,
      depth,
      done: block.done
    });
    flattenBlocks(block.children, depth + 1, output);
  }

  return output;
}

async function snapshot(page) {
  return page.evaluate(() => window.__perfectNotesTest.snapshot());
}

async function noteState(page, noteIndex = 0) {
  const state = await snapshot(page);
  return state.notes[noteIndex];
}

async function flatNote(page, noteIndex = 0) {
  return flattenBlocks((await noteState(page, noteIndex)).blocks);
}

async function acceptNextDialog(page) {
  page.once("dialog", (dialog) => dialog.accept());
}

async function dismissNextDialog(page) {
  page.once("dialog", (dialog) => dialog.dismiss());
}

async function addNote(page, bodyText = "") {
  const beforeIds = (await snapshot(page)).notes.map((note) => note.id);
  await page.getByTestId("insert-note").first().click();
  const state = await snapshot(page);
  const newNoteId = state.notes.find((note) => !beforeIds.includes(note.id))?.id;
  const topNote = page.locator(`[data-testid="note"][data-note-id="${newNoteId}"]`);
  await expect(getBlock(topNote, 0)).toBeFocused();
  if (bodyText) {
    await getBlock(topNote, 0).fill(bodyText);
  }
  return topNote;
}

async function activeTextareaValue(page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    return active && active.tagName === "TEXTAREA" ? active.value : null;
  });
}

async function gotoPerfectNotesWithFixedNow(page, isoString) {
  const now = new Date(isoString).getTime();

  await page.goto("about:blank");
  await page.addInitScript(({ fixedNow }) => {
    const OriginalDate = Date;
    let currentNow = fixedNow;

    class MockDate extends OriginalDate {
      constructor(...args) {
        super(...(args.length === 0 ? [currentNow] : args));
      }

      static now() {
        return currentNow;
      }
    }

    Object.setPrototypeOf(MockDate, OriginalDate);
    window.Date = MockDate;
  }, { fixedNow: now });
  await page.goto("/perfect_notes/");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/perfect_notes/");
});

test("scaffold inicial y nota nueva arriba", async ({ page }) => {
  const firstNote = getNote(page, 0);

  await expect(page.getByTestId("note")).toHaveCount(1);
  await expect(getBlock(firstNote, 0)).toHaveAttribute("placeholder", "hola?");
  await expect(firstNote.getByTestId("note-stamp")).toHaveText(HUMAN_STAMP_PATTERN);

  await getBlock(firstNote, 0).fill("nota base");
  await addNote(page, "nota nueva");

  const state = await snapshot(page);
  expect(state.notes.map((note) => note.blocks[0].text)).toEqual(["nota nueva", "nota base"]);
});

test("timestamp humano usa segundos minutos horas ayer y fallback absoluto", async ({ page }) => {
  await gotoPerfectNotesWithFixedNow(page, "2026-03-23T15:00:00.000Z");

  const [{ id: noteId }] = (await snapshot(page)).notes;
  const stamp = getNote(page, 0).getByTestId("note-stamp");
  const cases = [
    { updatedAt: "2026-03-23T14:59:30.000Z", expected: "Marcos - hace 30 segundos" },
    { updatedAt: "2026-03-23T14:58:00.000Z", expected: "Marcos - hace 2 minutos" },
    { updatedAt: "2026-03-23T11:00:00.000Z", expected: "Marcos - hace 4 horas" },
    { updatedAt: "2026-03-22T15:00:00.000Z", expected: "Marcos - ayer" },
    { updatedAt: "2026-03-20T18:45:00.000Z", expected: "Marcos - 2026/03/20 15:45" }
  ];

  for (const testCase of cases) {
    await page.evaluate(
      ({ id, updatedAt }) => window.__perfectNotesTest.setNoteUpdatedAt(id, updatedAt),
      { id: noteId, updatedAt: testCase.updatedAt }
    );
    await expect(stamp).toHaveText(testCase.expected);
  }
});

test("placeholders sutiles y una sola accion global de nueva nota", async ({ page }) => {
  const firstNote = getNote(page, 0);
  const feedBar = page.getByTestId("feed-bar");

  await expect(firstNote.getByTestId("note-title")).toHaveAttribute("placeholder", /.+/);
  await expect(getBlock(firstNote, 0)).toHaveAttribute("placeholder", "hola?");
  await expect(feedBar).toBeVisible();
  await expect(firstNote.getByTestId("toggle-pin")).toBeVisible();
  await expect(firstNote.getByTestId("toggle-pin")).toHaveText("pinear");
  await expect(firstNote.getByTestId("delete-note")).toBeVisible();
  await expect(firstNote.getByTestId("note-footer-actions")).toBeVisible();
  await expect(page.getByTestId("insert-note")).toHaveCount(1);
  await expect(page.getByTestId("insert-note").first()).toHaveText("+ nota");

  const placement = await feedBar.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      position: window.getComputedStyle(element).position,
      bottomOffset: window.innerHeight - rect.bottom
    };
  });
  expect(placement.position).toBe("fixed");
  expect(Math.abs(placement.bottomOffset)).toBeLessThan(2);

  const pinnedNote = await addNote(page, "nota fija");
  await acceptNextDialog(page);
  await pinnedNote.getByTestId("toggle-pin").click();
  await addNote(page, "nota libre");

  await expect(getNote(page, 0).getByTestId("note-footer-actions")).toBeHidden();
  await expect(getNote(page, 1).getByTestId("note-footer-actions")).toBeVisible();
  await expect(page.getByTestId("insert-note")).toHaveCount(1);
  await expect(page.getByTestId("insert-note").first()).toHaveText("+ nota");
});

test("pin, orden del feed y borrado solo para no pineadas", async ({ page }) => {
  const firstNote = getNote(page, 0);
  await getBlock(firstNote, 0).fill("nota base");

  const secondNote = await addNote(page, "nota pineable");
  await acceptNextDialog(page);
  await secondNote.getByTestId("toggle-pin").click();

  await addNote(page, "nota libre");

  let state = await snapshot(page);
  expect(state.notes.map((note) => ({ text: note.blocks[0].text, pinned: note.pinned }))).toEqual([
    { text: "nota pineable", pinned: true },
    { text: "nota libre", pinned: false },
    { text: "nota base", pinned: false }
  ]);

  await expect(getNote(page, 0).getByTestId("toggle-pin")).toHaveText("despinear");
  await expect(getNote(page, 0).getByTestId("delete-note")).toBeHidden();
  await expect(getNote(page, 1).getByTestId("delete-note")).toBeVisible();
  await expect(getNote(page, 2).getByTestId("delete-note")).toBeHidden();

  await dismissNextDialog(page);
  await getNote(page, 1).getByTestId("delete-note").click();
  await expect(page.getByTestId("note")).toHaveCount(3);

  await acceptNextDialog(page);
  await getNote(page, 1).getByTestId("delete-note").click();

  state = await snapshot(page);
  expect(state.notes.map((note) => note.blocks[0].text)).toEqual(["nota pineable", "nota base"]);
});

test("cancelar pin no cambia orden y despinear devuelve al inicio de no pineadas", async ({ page }) => {
  await getBlock(getNote(page, 0), 0).fill("nota base");

  const movingNote = await addNote(page, "nota movible");
  await dismissNextDialog(page);
  await movingNote.getByTestId("toggle-pin").click();

  let state = await snapshot(page);
  expect(state.notes.map((note) => ({ text: note.blocks[0].text, pinned: note.pinned }))).toEqual([
    { text: "nota movible", pinned: false },
    { text: "nota base", pinned: false }
  ]);

  await acceptNextDialog(page);
  await getNote(page, 0).getByTestId("toggle-pin").click();
  await addNote(page, "otra");
  await acceptNextDialog(page);
  await getBlock(getNote(page, 0), 0).click();
  await getNote(page, 0).getByTestId("toggle-pin").click();

  state = await snapshot(page);
  expect(state.notes.map((note) => ({ text: note.blocks[0].text, pinned: note.pinned }))).toEqual([
    { text: "nota movible", pinned: false },
    { text: "otra", pinned: false },
    { text: "nota base", pinned: false }
  ]);
});

test("la nota activa usa borde grueso y la pineada mantiene una marca propia", async ({ page }) => {
  const initialNoteStyle = await getNote(page, 0).evaluate((note) => {
    const fieldset = note.querySelector("fieldset");
    const footer = note.querySelector(".note-footer");

    return {
      fieldsetBorderWidth: Number.parseFloat(getComputedStyle(fieldset).borderTopWidth),
      footerBorderWidth: Number.parseFloat(getComputedStyle(footer).borderBottomWidth)
    };
  });

  expect(initialNoteStyle.fieldsetBorderWidth).toBeGreaterThan(1);
  expect(initialNoteStyle.footerBorderWidth).toBeGreaterThan(1);

  const pinnedNote = await addNote(page, "nota pineada");
  await acceptNextDialog(page);
  await pinnedNote.getByTestId("toggle-pin").click();
  await addNote(page, "nota activa");

  const pinnedStyle = await getNote(page, 0).evaluate((note) => {
    const fieldset = note.querySelector("fieldset");
    const footer = note.querySelector(".note-footer");
    const computed = getComputedStyle(note);

    return {
      fieldsetBorderWidth: getComputedStyle(fieldset).borderTopWidth,
      footerBorderWidth: getComputedStyle(footer).borderBottomWidth,
      outlineStyle: computed.outlineStyle,
      outlineOffset: computed.outlineOffset,
      boxShadow: computed.boxShadow
    };
  });

  expect(pinnedStyle.fieldsetBorderWidth).toBe("1px");
  expect(pinnedStyle.footerBorderWidth).toBe("1px");
  expect(pinnedStyle.outlineStyle).toBe("solid");
  expect(Number.parseFloat(pinnedStyle.outlineOffset)).toBeGreaterThan(2);
  expect(pinnedStyle.boxShadow).toBe("none");

  const activeStyle = await getNote(page, 1).evaluate((note) => {
    const fieldset = note.querySelector("fieldset");
    const footer = note.querySelector(".note-footer");

    return {
      fieldsetBorderWidth: Number.parseFloat(getComputedStyle(fieldset).borderTopWidth),
      footerBorderWidth: Number.parseFloat(getComputedStyle(footer).borderBottomWidth)
    };
  });

  expect(activeStyle.fieldsetBorderWidth).toBeGreaterThan(1);
  expect(activeStyle.footerBorderWidth).toBeGreaterThan(1);
});

test("texto continuo, nuevo parrafo y navegacion vertical con flechas", async ({ page }) => {
  const firstNote = getNote(page, 0);
  const title = firstNote.getByTestId("note-title");

  await title.fill("Mi nota");
  await title.press("Enter");
  await expect(getBlock(firstNote, 0)).toBeFocused();

  await getBlock(firstNote, 0).type("linea uno");
  await getBlock(firstNote, 0).press("Enter");
  await getBlock(firstNote, 0).type("linea dos");

  let state = await noteState(page, 0);
  expect(state.blocks.map((block) => block.text)).toEqual(["linea uno\nlinea dos"]);

  await getBlock(firstNote, 0).press("Enter");
  await getBlock(firstNote, 0).press("Enter");
  await expect(getBlock(firstNote, 1)).toBeFocused();
  await getBlock(firstNote, 1).type("parrafo dos");

  state = await noteState(page, 0);
  expect(state.blocks.map((block) => block.text)).toEqual(["linea uno\nlinea dos", "parrafo dos"]);

  await getBlock(firstNote, 1).evaluate((element) => element.setSelectionRange(0, 0));
  await getBlock(firstNote, 1).press("ArrowUp");
  await expect(getBlock(firstNote, 0)).toBeFocused();

  await getBlock(firstNote, 0).evaluate((element) => element.setSelectionRange(0, 0));
  await getBlock(firstNote, 0).press("ArrowUp");
  await expect(title).toBeFocused();

  await title.evaluate((element) => {
    const position = element.value.length;
    element.setSelectionRange(position, position);
  });
  await title.press("ArrowDown");
  await expect(getBlock(firstNote, 0)).toBeFocused();
});

test("checklist: insercion, toggle, indentacion, enter y salida escalonada", async ({ page }) => {
  const note = getNote(page, 0);

  await note.getByTestId("add-check").first().click();
  await expect(note.getByTestId("check-toggle")).toHaveCount(1);
  await expect(getBlock(note, 0)).toBeFocused();

  await getBlock(note, 0).fill("item 1");
  await note.getByTestId("check-toggle").first().check();
  let state = await noteState(page, 0);
  expect(state.blocks[0].done).toBe(true);
  await note.getByTestId("check-toggle").first().uncheck();

  await getBlock(note, 0).press("Enter");
  await getBlock(note, 1).fill("item 2");
  await getBlock(note, 1).press("Tab");
  await getBlock(note, 1).press("Enter");
  await getBlock(note, 2).fill("item 3");
  await getBlock(note, 2).press("Tab");

  let flat = await flatNote(page, 0);
  expect(flat.map(({ type, text, depth }) => ({ type, text, depth }))).toEqual([
    { type: "check", text: "item 1", depth: 0 },
    { type: "check", text: "item 2", depth: 1 },
    { type: "check", text: "item 3", depth: 2 }
  ]);

  await getBlock(note, 2).press("Enter");
  flat = await flatNote(page, 0);
  expect(flat.at(-1)).toMatchObject({ type: "check", text: "", depth: 2 });

  await getBlock(note, 3).press("Enter");
  flat = await flatNote(page, 0);
  expect(flat.at(-1)).toMatchObject({ type: "check", text: "", depth: 1 });

  await getBlock(note, 3).press("Enter");
  flat = await flatNote(page, 0);
  expect(flat.at(-1)).toMatchObject({ type: "check", text: "", depth: 0 });

  await getBlock(note, 3).press("Enter");
  flat = await flatNote(page, 0);
  expect(flat.at(-1)).toMatchObject({ type: "text", text: "", depth: 0 });
  await expect(note.getByTestId("add-check").last()).toHaveText("+ checklist");
});

test("checklist sobre texto vacio convierte el bloque actual en lugar", async ({ page }) => {
  const note = getNote(page, 0);

  await note.getByTestId("add-check").first().click();

  const state = await noteState(page, 0);
  expect(state.blocks).toHaveLength(1);
  expect(state.blocks[0]).toMatchObject({ type: "check", text: "" });
});

test("crear checklist debajo de texto y no exponer + item dentro del checklist", async ({ page }) => {
  const note = getNote(page, 0);

  await getBlock(note, 0).fill("intro");
  await note.getByTestId("add-check").first().click();
  await expect(note.getByTestId("check-toggle")).toHaveCount(1);

  const state = await noteState(page, 0);
  expect(state.blocks.map((block) => ({ type: block.type, text: block.text }))).toEqual([
    { type: "text", text: "intro" },
    { type: "check", text: "" }
  ]);

  await getBlock(note, 1).click();
  await expect(note.getByRole("button", { name: "+ item" })).toHaveCount(0);
});

test("flechas inline permiten indentar y sacar nivel sin teclado complejo", async ({ page }) => {
  const note = getNote(page, 0);

  await note.getByTestId("add-check").first().click();
  await getBlock(note, 0).fill("padre");
  await getBlock(note, 0).press("Enter");
  await getBlock(note, 1).fill("hijo");
  await getBlock(note, 1).click();
  await note.locator('[data-testid="indent"]:visible').first().click();

  let flat = await flatNote(page, 0);
  expect(flat.map(({ text, depth }) => ({ text, depth }))).toEqual([
    { text: "padre", depth: 0 },
    { text: "hijo", depth: 1 }
  ]);

  await getBlock(note, 1).click();
  await note.locator('[data-testid="outdent"]:visible').first().click();

  flat = await flatNote(page, 0);
  expect(flat.map(({ text, depth }) => ({ text, depth }))).toEqual([
    { text: "padre", depth: 0 },
    { text: "hijo", depth: 0 }
  ]);
});

test("salir de checklist vacio en base conserva hijos como bloques siguientes", async ({ page }) => {
  const note = getNote(page, 0);

  await note.getByTestId("add-check").first().click();
  await getBlock(note, 0).fill("padre");
  await getBlock(note, 0).press("Enter");
  await getBlock(note, 1).fill("hijo");
  await getBlock(note, 1).press("Tab");
  await getBlock(note, 0).fill("");
  await getBlock(note, 0).press("Enter");

  const flat = await flatNote(page, 0);
  expect(flat.map(({ type, text, depth }) => ({ type, text, depth }))).toEqual([
    { type: "text", text: "", depth: 0 },
    { type: "check", text: "hijo", depth: 0 }
  ]);
  await expect(note.getByTestId("add-check").first()).toHaveText("+ checklist");
});

test("backspace borra en orden visible real, pasando por subitems antes que el padre", async ({ page }) => {
  const note = getNote(page, 0);

  await getBlock(note, 0).fill("texto");
  await note.getByTestId("add-check").first().click();

  await getBlock(note, 1).fill("item1");
  await getBlock(note, 1).press("Enter");
  await getBlock(note, 2).fill("sub1");
  await getBlock(note, 2).press("Tab");
  await getBlock(note, 2).press("Enter");
  await getBlock(note, 3).fill("sub2");
  await getBlock(note, 3).press("Tab");

  await getBlock(note, 3).press("Enter");
  await getBlock(note, 4).press("Enter");
  await getBlock(note, 4).press("Enter");
  await getBlock(note, 4).press("Enter");
  await getBlock(note, 4).fill("nuevo texto");
  await getBlock(note, 4).press("Enter");
  await getBlock(note, 4).press("Enter");
  await getBlock(note, 5).fill("otro nuevo texto");

  let flat = await flatNote(page, 0);
  expect(flat.map(({ text, depth, type }) => ({ text, depth, type }))).toEqual([
    { text: "texto", depth: 0, type: "text" },
    { text: "item1", depth: 0, type: "check" },
    { text: "sub1", depth: 1, type: "check" },
    { text: "sub2", depth: 2, type: "check" },
    { text: "nuevo texto", depth: 0, type: "text" },
    { text: "otro nuevo texto", depth: 0, type: "text" }
  ]);

  await getBlock(note, 5).fill("");
  await getBlock(note, 5).press("Backspace");
  await expect(getBlock(note, 4)).toBeFocused();
  expect(await activeTextareaValue(page)).toBe("nuevo texto");

  await getBlock(note, 4).fill("");
  await getBlock(note, 4).press("Backspace");
  await expect(getBlock(note, 3)).toBeFocused();
  expect(await activeTextareaValue(page)).toBe("sub2");

  await getBlock(note, 3).fill("");
  await getBlock(note, 3).press("Backspace");
  await expect(getBlock(note, 2)).toBeFocused();
  expect(await activeTextareaValue(page)).toBe("sub1");

  await getBlock(note, 2).fill("");
  await getBlock(note, 2).press("Backspace");
  await expect(getBlock(note, 1)).toBeFocused();
  expect(await activeTextareaValue(page)).toBe("item1");
});

test("borrar la ultima nota recrea una nota vacia", async ({ page }) => {
  await acceptNextDialog(page);
  await getNote(page, 0).getByTestId("delete-note").click();

  await expect(page.getByTestId("note")).toHaveCount(1);
  await expect(getNote(page, 0).getByTestId("note-title")).toHaveAttribute("placeholder", /.+/);
  await expect(getBlock(getNote(page, 0), 0)).toHaveAttribute("placeholder", "hola?");

  const state = await snapshot(page);
  expect(state.notes).toHaveLength(1);
  expect(state.notes[0].blocks).toHaveLength(1);
  expect(state.notes[0].blocks[0]).toMatchObject({ type: "text", text: "" });
});

test("una nota pineada no se borra ni siquiera con click programatico al boton oculto", async ({ page }) => {
  const pinnedNote = await addNote(page, "nota protegida");
  await acceptNextDialog(page);
  await pinnedNote.getByTestId("toggle-pin").click();

  let dialogSeen = false;
  page.on("dialog", (dialog) => {
    dialogSeen = true;
    dialog.dismiss();
  });

  await page.evaluate(() => {
    const deleteButton = document.querySelector('[data-testid="note"][data-pinned="true"] [data-testid="delete-note"]');
    deleteButton?.click();
  });

  const state = await snapshot(page);
  expect(state.notes).toHaveLength(2);
  expect(state.notes[0]).toMatchObject({ pinned: true });
  expect(dialogSeen).toBe(false);
});

test("en mobile webkit las acciones clave no provocan saltos bruscos de viewport", async ({ page }, testInfo) => {
  test.skip(!(testInfo.project.use && testInfo.project.use.isMobile), "solo mobile");

  for (let index = 0; index < 8; index += 1) {
    await addNote(page, `nota ${index}`);
  }

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

  const bottomNote = getNote(page, await page.getByTestId("note").count() - 1);
  await bottomNote.scrollIntoViewIfNeeded();
  await getBlock(bottomNote, 0).click();

  const beforeCheck = await page.evaluate(() => window.scrollY);
  await bottomNote.getByTestId("add-check").first().click();
  const afterCheck = await page.evaluate(() => window.scrollY);
  expect(Math.abs(afterCheck - beforeCheck)).toBeLessThan(80);

  await getBlock(bottomNote, 0).fill("item base");
  await getBlock(bottomNote, 0).press("Enter");
  await getBlock(bottomNote, 1).fill("item hijo");
  await getBlock(bottomNote, 1).click();

  const beforeIndent = await page.evaluate(() => window.scrollY);
  await bottomNote.locator('[data-testid="indent"]:visible').first().click();
  const afterIndent = await page.evaluate(() => window.scrollY);
  expect(Math.abs(afterIndent - beforeIndent)).toBeLessThan(80);
});
