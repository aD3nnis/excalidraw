import React from "react";
import { vi } from "vitest";

import { actionLoadScene, actionSaveFileToDisk } from "../actions";
import { fileOpen, fileSave } from "../data/filesystem";
import { t } from "../i18n";
import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { render, waitFor } from "./test-utils";

const { h } = window;

vi.mock("../data/filesystem.ts", async (importOriginal) => {
  const module = await importOriginal();
  return {
    __esmodule: true,
    //@ts-ignore
    ...module,
    fileSave: vi.fn(),
    fileOpen: vi.fn(),
  };
});

// what Chrome throws when file editing is blocked in site settings (#5951)
const permissionError = () =>
  new DOMException(
    "The request is not allowed by the user agent or the platform in the current context.",
    "NotAllowedError",
  );

describe("filesystem permission errors (#5951)", () => {
  beforeEach(async () => {
    vi.mocked(fileSave).mockReset();
    vi.mocked(fileOpen).mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await render(<Excalidraw />);
    API.setAppState({ errorMessage: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains a blocked save instead of failing silently", async () => {
    vi.mocked(fileSave).mockRejectedValue(permissionError());

    API.executeAction(actionSaveFileToDisk);

    await waitFor(() => {
      expect(h.state.errorMessage).toBe(t("errors.fileSystemPermissionDenied"));
    });
  });

  it("explains a blocked open instead of showing the raw browser error", async () => {
    vi.mocked(fileOpen).mockRejectedValue(permissionError());

    API.executeAction(actionLoadScene);

    await waitFor(() => {
      expect(h.state.errorMessage).toBe(t("errors.fileSystemPermissionDenied"));
    });
  });

  it("stays quiet when the user cancels the file picker", async () => {
    vi.mocked(fileSave).mockRejectedValue(
      new DOMException("The user aborted a request.", "AbortError"),
    );

    API.executeAction(actionSaveFileToDisk);

    await waitFor(() => {
      expect(fileSave).toHaveBeenCalled();
    });
    expect(h.state.errorMessage).toBe(null);
  });
});
