(function() {
  const modal = document.getElementById('manualImportModal');
  if (!modal) return;

  const openers = document.querySelectorAll('[data-manual-import-open]');
  const closers = modal.querySelectorAll('[data-manual-import-close]');
  const form = document.getElementById('manualImportForm');
  const msgEl = document.getElementById('manualImportMsg');
  const submitBtn = document.getElementById('manualImportSubmit');

  const instanceAddBtn = document.getElementById('manualAddInstance');
  const instancePicker = document.getElementById('manualInstancePicker');
  const instanceList = document.getElementById('instanceDescList');
  const instanceEntries = [];

  const draftSessionInput = document.getElementById('manualDraftSessionId');
  const draftOverridesInput = document.getElementById('manualDraftOverrides');
  const parse3mfBtn = document.getElementById('manualParse3mf');
  const parse3mfInput = document.getElementById('manual3mfPicker');
  const draftPreview = document.getElementById('manualParsedPreview');
  const draftCover = document.getElementById('manualDraftCover');
  const draftTitle = document.getElementById('manualDraftTitle');
  const draftDesigner = document.getElementById('manualDraftDesigner');
  const draftDesignList = document.getElementById('manualDraftDesignList');
  const draftAttachmentList = document.getElementById('manualDraftAttachmentList');
  const parsedInstanceList = document.getElementById('parsedInstanceList');
  const summaryEditor = document.getElementById('manualSummaryEditor');
  const summaryTextInput = document.getElementById('manualSummaryText');
  const summaryHtmlInput = document.getElementById('manualSummaryHtml');
  const richButtons = modal.querySelectorAll('[data-rich-cmd]');
  const parseInstancesBtn = document.getElementById('manualParseInstances');

  let parsedDraft = null;

  function setMsg(text, isError, isSuccess) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.classList.remove('error');
    msgEl.classList.remove('success');
    if (isError) msgEl.classList.add('error');
    if (isSuccess) msgEl.classList.add('success');
  }

  function refreshInstanceLabels() {
    instanceEntries.forEach((entry, idx) => {
      entry.nameEl.textContent = `实例 ${idx + 1}: ${entry.file.name}`;
    });
  }

  function normalizeDraftFileName(value) {
    return String(value || '').replace(/^s\d+_/i, '');
  }

  function fileStem(name) {
    const n = normalizeDraftFileName(name);
    const dot = n.lastIndexOf('.');
    return dot > 0 ? n.slice(0, dot) : n;
  }

  function clearInstanceEntries() {
    instanceEntries.splice(0, instanceEntries.length);
    if (instanceList) instanceList.innerHTML = '';
  }

  function clearDraftPreview() {
    parsedDraft = null;
    if (draftSessionInput) draftSessionInput.value = '';
    if (draftOverridesInput) draftOverridesInput.value = '[]';
    if (draftPreview) draftPreview.classList.add('hidden');
    if (parsedInstanceList) parsedInstanceList.innerHTML = '';
    if (draftDesignList) draftDesignList.innerHTML = '';
    if (draftAttachmentList) draftAttachmentList.innerHTML = '';
    if (draftCover) draftCover.src = '';
    if (draftTitle) draftTitle.textContent = '';
    if (draftDesigner) draftDesigner.textContent = '';
  }

  function htmlToPlainText(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return (div.textContent || div.innerText || '').trim();
  }

  function normalizeSummaryHtml(html) {
    const v = String(html || '').replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
    if (!v || v === '<br>' || v === '<p><br></p>') return '';
    return v;
  }

  function setSummaryEditor(contentHtml, fallbackText) {
    if (!summaryEditor) return;
    const html = normalizeSummaryHtml(contentHtml);
    if (html) {
      summaryEditor.innerHTML = html;
    } else {
      const text = String(fallbackText || '').trim();
      summaryEditor.innerText = text;
    }
    syncSummaryFields();
  }

  function syncSummaryFields() {
    if (!summaryEditor) return;
    const html = normalizeSummaryHtml(summaryEditor.innerHTML);
    const plain = htmlToPlainText(html || summaryEditor.innerText || '');
    if (summaryHtmlInput) summaryHtmlInput.value = html;
    if (summaryTextInput) summaryTextInput.value = plain;
  }

  function openModal() {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    setMsg('');
  }

  openers.forEach((btn) => btn.addEventListener('click', openModal));
  closers.forEach((btn) => btn.addEventListener('click', closeModal));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (summaryEditor) {
    summaryEditor.addEventListener('input', syncSummaryFields);
    summaryEditor.addEventListener('blur', syncSummaryFields);
  }

  richButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!summaryEditor) return;
      summaryEditor.focus();
      const cmd = btn.getAttribute('data-rich-cmd') || '';
      const val = btn.getAttribute('data-rich-value') || null;
      try {
        document.execCommand(cmd, false, val);
      } catch (_) {}
      syncSummaryFields();
    });
  });

  function addInstanceFiles(files) {
    if (!instanceList || !files || !files.length) return;
    Array.from(files).forEach((file, idx) => {
      const row = document.createElement('div');
      row.className = 'file-desc-item';

      const name = document.createElement('div');
      name.className = 'file-name';
      name.textContent = `实例 ${instanceEntries.length + idx + 1}: ${file.name}`;

      const titleLabel = document.createElement('label');
      titleLabel.textContent = '实例标题';
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = fileStem(file.name);

      const label = document.createElement('label');
      label.textContent = '实例介绍';
      const input = document.createElement('textarea');
      input.setAttribute('data-instance-desc', '1');
      input.rows = 2;

      const picLabel = document.createElement('label');
      picLabel.textContent = '实例图片 (多选)';
      const picInput = document.createElement('input');
      picInput.type = 'file';
      picInput.accept = 'image/*';
      picInput.multiple = true;
      picInput.setAttribute('data-instance-pics', '1');

      const parseHint = document.createElement('div');
      parseHint.className = 'manual-help';
      const parsedGallery = document.createElement('div');
      parsedGallery.className = 'manual-mini-gallery';

      const actions = document.createElement('div');
      actions.className = 'file-desc-actions';
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'manual-btn danger';
      removeBtn.textContent = '移除';
      removeBtn.addEventListener('click', () => {
        const index = instanceEntries.findIndex((entry) => entry.row === row);
        if (index >= 0) instanceEntries.splice(index, 1);
        row.remove();
        refreshInstanceLabels();
      });
      actions.appendChild(removeBtn);

      row.appendChild(name);
      row.appendChild(titleLabel);
      row.appendChild(titleInput);
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(picLabel);
      row.appendChild(picInput);
      row.appendChild(parseHint);
      row.appendChild(parsedGallery);
      row.appendChild(actions);
      instanceList.appendChild(row);
      instanceEntries.push({
        file,
        nameEl: name,
        titleEl: titleInput,
        descEl: input,
        picEl: picInput,
        hintEl: parseHint,
        galleryEl: parsedGallery,
        row,
      });
    });
    refreshInstanceLabels();
  }

  function renderDraftInstances(instances) {
    if (!parsedInstanceList) return;
    parsedInstanceList.innerHTML = '';
    (instances || []).forEach((inst, idx) => {
      const card = document.createElement('div');
      card.className = 'manual-draft-inst';

      const head = document.createElement('div');
      head.className = 'manual-draft-inst-head';
      const left = document.createElement('div');
      left.className = 'left';

      const enable = document.createElement('input');
      enable.type = 'checkbox';
      enable.checked = true;
      enable.setAttribute('data-draft-enabled', String(idx));
      left.appendChild(enable);

      const fileTag = document.createElement('span');
      fileTag.className = 'manual-help';
      const preferredName = inst.sourceFileName || inst.name || '';
      fileTag.textContent = normalizeDraftFileName(preferredName);
      left.appendChild(fileTag);
      head.appendChild(left);
      card.appendChild(head);

      const titleLabel = document.createElement('label');
      titleLabel.textContent = `实例 ${idx + 1} 标题`;
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'manual-draft-inst-title';
      titleInput.value = inst.title || '';
      titleInput.setAttribute('data-draft-title', String(idx));

      const summaryLabel = document.createElement('label');
      summaryLabel.textContent = '实例介绍';
      const summaryInput = document.createElement('textarea');
      summaryInput.rows = 2;
      summaryInput.value = inst.summary || '';
      summaryInput.setAttribute('data-draft-summary', String(idx));

      card.appendChild(titleLabel);
      card.appendChild(titleInput);
      card.appendChild(summaryLabel);
      card.appendChild(summaryInput);
      parsedInstanceList.appendChild(card);
    });
  }

  function renderDraftAssets(draft) {
    if (draftDesignList) {
      draftDesignList.innerHTML = '';
      const designUrls = Array.isArray(draft.designUrls) ? draft.designUrls : [];
      designUrls.forEach((url, idx) => {
        const img = document.createElement('img');
        img.className = 'manual-draft-thumb';
        img.src = String(url || '');
        img.alt = `design-${idx + 1}`;
        draftDesignList.appendChild(img);
      });
      if (!designUrls.length) {
        const empty = document.createElement('div');
        empty.className = 'manual-help';
        empty.textContent = '未识别到设计图片';
        draftDesignList.appendChild(empty);
      }
    }
    if (draftAttachmentList) {
      draftAttachmentList.innerHTML = '';
      const files = Array.isArray(draft.attachmentUrls) ? draft.attachmentUrls : [];
      files.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'manual-draft-file';
        div.textContent = normalizeDraftFileName(item && item.name ? item.name : '');
        draftAttachmentList.appendChild(div);
      });
      if (!files.length) {
        const empty = document.createElement('div');
        empty.className = 'manual-help';
        empty.textContent = '未识别到附件';
        draftAttachmentList.appendChild(empty);
      }
    }
  }

  function mapParsedInstancesToEntries(instances) {
    const parsed = Array.isArray(instances) ? instances.slice() : [];
    const parsedByName = new Map();
    parsed.forEach((inst) => {
      const key = normalizeDraftFileName(inst && (inst.sourceFileName || inst.name || '')).toLowerCase();
      if (!key) return;
      if (!parsedByName.has(key)) parsedByName.set(key, []);
      parsedByName.get(key).push(inst);
    });

    const picks = [];
    instanceEntries.forEach((entry) => {
      const key = normalizeDraftFileName(entry.file && entry.file.name).toLowerCase();
      const queue = parsedByName.get(key) || [];
      if (queue.length) {
        picks.push(queue.shift());
        return;
      }
      picks.push(parsed.shift() || null);
    });
    return picks;
  }

  function applyInstanceParsedResult(entry, parsed, idx) {
    if (!entry || !parsed) return;
    const parsedTitle = String(parsed.title || '').trim();
    const parsedSummary = String(parsed.summary || '').trim();
    const currentTitle = entry.titleEl ? String(entry.titleEl.value || '').trim() : '';
    const currentSummary = entry.descEl ? String(entry.descEl.value || '').trim() : '';
    if (entry.titleEl && (!currentTitle || currentTitle === fileStem(entry.file.name))) {
      entry.titleEl.value = parsedTitle || fileStem(entry.file.name);
    }
    if (entry.descEl && !currentSummary && parsedSummary) {
      entry.descEl.value = parsedSummary;
    }

    if (entry.hintEl) {
      const picCount = Array.isArray(parsed.pictures) ? parsed.pictures.length : 0;
      const plateCount = Array.isArray(parsed.plates) ? parsed.plates.length : 0;
      entry.hintEl.textContent = `已识别：实例 ${idx + 1}，图片 ${picCount} 张，盘 ${plateCount} 个`;
    }
    if (entry.galleryEl) {
      entry.galleryEl.innerHTML = '';
      const pics = Array.isArray(parsed.pictures) ? parsed.pictures : [];
      pics.slice(0, 8).forEach((pic, pidx) => {
        const preview = pic && pic.previewUrl ? String(pic.previewUrl) : '';
        if (!preview) return;
        const img = document.createElement('img');
        img.src = preview;
        img.alt = `inst-${idx + 1}-pic-${pidx + 1}`;
        entry.galleryEl.appendChild(img);
      });
    }
  }

  function collectDraftOverrides() {
    if (!parsedDraft || !parsedDraft.instances) return [];
    return parsedDraft.instances.map((_, idx) => {
      const enabledEl = parsedInstanceList.querySelector(`[data-draft-enabled="${idx}"]`);
      const titleEl = parsedInstanceList.querySelector(`[data-draft-title="${idx}"]`);
      const summaryEl = parsedInstanceList.querySelector(`[data-draft-summary="${idx}"]`);
      return {
        enabled: !!(enabledEl && enabledEl.checked),
        title: titleEl ? titleEl.value : '',
        summary: summaryEl ? summaryEl.value : '',
      };
    });
  }

  async function parse3mfFiles() {
    if (!parse3mfInput || !parse3mfInput.files || !parse3mfInput.files.length) {
      setMsg('请先选择 3MF 文件', true);
      return;
    }
    const fd = new FormData();
    Array.from(parse3mfInput.files).forEach((f) => fd.append('files', f));

    const oldText = parse3mfBtn ? parse3mfBtn.textContent : '';
    if (parse3mfBtn) {
      parse3mfBtn.disabled = true;
      parse3mfBtn.textContent = '识别中...';
    }
    setMsg('正在解析 3MF ...');
    try {
      const res = await fetch('/api/manual/3mf/parse', { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || '解析失败');
      }
      const data = await res.json();
      const draft = data && data.draft ? data.draft : null;
      if (!draft) throw new Error('解析结果为空');
      parsedDraft = draft;

      if (draftSessionInput) draftSessionInput.value = draft.sessionId || '';
      if (draftTitle) draftTitle.textContent = draft.title || '未命名模型';
      if (draftDesigner) draftDesigner.textContent = draft.designer ? `作者: ${draft.designer}` : '作者: 未识别';
      if (draftCover) {
        draftCover.src = draft.coverUrl || '';
        draftCover.style.display = draft.coverUrl ? '' : 'none';
      }
      if (draftPreview) draftPreview.classList.remove('hidden');

      renderDraftAssets(draft);
      renderDraftInstances(draft.instances || []);

      const titleInput = form.querySelector('[name="title"]');
      if (titleInput && !titleInput.value.trim()) titleInput.value = draft.title || '';
      const currentSummaryText = summaryTextInput ? summaryTextInput.value.trim() : '';
      const currentSummaryHtml = summaryHtmlInput ? summaryHtmlInput.value.trim() : '';
      if (!currentSummaryText && !currentSummaryHtml) {
        setSummaryEditor(draft.summaryHtml || '', draft.summary || '');
      }
      const sourceInput = form.querySelector('[name="sourceLink"]');
      if (sourceInput && !sourceInput.value.trim()) sourceInput.value = '';

      setMsg('3MF 识别完成，可补充信息后保存归档', false, true);
    } catch (err) {
      setMsg(`3MF 识别失败：${err.message || err}`, true);
    } finally {
      if (parse3mfBtn) {
        parse3mfBtn.disabled = false;
        parse3mfBtn.textContent = oldText || '识别并填充';
      }
    }
  }

  async function parseAddedInstanceFiles() {
    if (!instanceEntries.length) {
      setMsg('请先添加实例文件', true);
      return;
    }
    const fd = new FormData();
    instanceEntries.forEach((entry) => {
      if (entry && entry.file) fd.append('files', entry.file);
    });
    const oldText = parseInstancesBtn ? parseInstancesBtn.textContent : '';
    if (parseInstancesBtn) {
      parseInstancesBtn.disabled = true;
      parseInstancesBtn.textContent = '识别中...';
    }
    setMsg('正在识别实例配置...');
    try {
      const res = await fetch('/api/manual/3mf/parse', { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || '实例识别失败');
      }
      const data = await res.json();
      const draft = data && data.draft ? data.draft : null;
      if (!draft || !Array.isArray(draft.instances)) throw new Error('实例识别结果为空');
      const mapped = mapParsedInstancesToEntries(draft.instances);
      mapped.forEach((inst, idx) => applyInstanceParsedResult(instanceEntries[idx], inst, idx));
      setMsg('实例识别完成：已填充实例标题/介绍，并回显配置图片', false, true);
    } catch (err) {
      setMsg(`实例识别失败：${err.message || err}`, true);
    } finally {
      if (parseInstancesBtn) {
        parseInstancesBtn.disabled = false;
        parseInstancesBtn.textContent = oldText || '识别实例信息';
      }
    }
  }

  if (instanceAddBtn && instancePicker) {
    instanceAddBtn.addEventListener('click', () => instancePicker.click());
    instancePicker.addEventListener('change', () => {
      addInstanceFiles(instancePicker.files);
      instancePicker.value = '';
    });
  }

  if (parse3mfBtn) parse3mfBtn.addEventListener('click', parse3mfFiles);
  if (parseInstancesBtn) parseInstancesBtn.addEventListener('click', parseAddedInstanceFiles);
  syncSummaryFields();

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (draftOverridesInput) {
        draftOverridesInput.value = JSON.stringify(collectDraftOverrides());
      }
      syncSummaryFields();

      const formData = new FormData();
      const titleInput = form.querySelector('[name="title"]');
      const modelLinkInput = form.querySelector('[name="modelLink"]');
      const sourceLinkInput = form.querySelector('[name="sourceLink"]');
      const summaryInput = form.querySelector('[name="summary"]');
      const summaryHtmlFormInput = form.querySelector('[name="summary_html"]');
      const tagsInput = form.querySelector('[name="tags"]');

      formData.append('title', titleInput ? titleInput.value : '');
      formData.append('modelLink', modelLinkInput ? modelLinkInput.value : '');
      formData.append('sourceLink', sourceLinkInput ? sourceLinkInput.value : '');
      formData.append('summary', summaryInput ? summaryInput.value : '');
      formData.append('summary_html', summaryHtmlFormInput ? summaryHtmlFormInput.value : '');
      formData.append('tags', tagsInput ? tagsInput.value : '');
      formData.append('draft_session_id', draftSessionInput ? draftSessionInput.value : '');
      formData.append('draft_instance_overrides', draftOverridesInput ? draftOverridesInput.value : '[]');

      const coverInput = form.querySelector('[name="cover"]');
      if (coverInput && coverInput.files && coverInput.files[0]) {
        formData.append('cover', coverInput.files[0]);
      }
      const designInput = form.querySelector('[name="design_images"]');
      if (designInput && designInput.files) {
        Array.from(designInput.files).forEach((f) => formData.append('design_images', f));
      }

      instanceEntries.forEach((entry) => formData.append('instance_files', entry.file));

      const attachmentsInput = form.querySelector('[name="attachments"]');
      if (attachmentsInput && attachmentsInput.files) {
        Array.from(attachmentsInput.files).forEach((f) => formData.append('attachments', f));
      }

      const descs = instanceEntries.map((entry) => entry.descEl.value || '');
      const titles = instanceEntries.map((entry) => entry.titleEl ? (entry.titleEl.value || '') : '');
      const picInputs = instanceEntries.map((entry) => entry.picEl);
      const picCounts = [];
      const picFiles = [];
      picInputs.forEach((input) => {
        const files = input.files ? Array.from(input.files) : [];
        picCounts.push(files.length);
        files.forEach((f) => picFiles.push(f));
      });
      formData.append('instance_descs', JSON.stringify(descs));
      formData.append('instance_titles', JSON.stringify(titles));
      formData.append('instance_picture_counts', JSON.stringify(picCounts));
      picFiles.forEach((f) => formData.append('instance_pictures', f));

      if (submitBtn) submitBtn.disabled = true;
      setMsg('上传中...');
      try {
        const res = await fetch('/api/models/manual', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(err || '导入失败');
        }
        const data = await res.json();
        form.reset();
        if (summaryEditor) summaryEditor.innerHTML = '';
        syncSummaryFields();
        clearInstanceEntries();
        clearDraftPreview();
        setMsg('导入成功', false, true);
        closeModal();
        showAlertModal('导入完成', data.work_dir || data.base_name || '', () => {
          window.location.reload();
        });
      } catch (err) {
        setMsg(`导入失败：${err.message || err}`, true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
})();

(function() {
  const batchModal = document.getElementById('batchFolderModal');
  if (!batchModal) return;

  const batchBtn = document.getElementById('batchFolderImportBtn');
  const selectFolderBtn = document.getElementById('batchSelectFolderBtn');
  const clearFoldersBtn = document.getElementById('batchClearFoldersBtn');
  const folderPicker = document.getElementById('batchFolderPicker');
  const dropZone = document.getElementById('batchDropZone');
  const preview = document.getElementById('batchFolderPreview');
  const folderList = document.getElementById('batchFolderList');
  const folderCountEl = document.getElementById('batchFolderCount');
  const modelCountEl = document.getElementById('batchModelCount');
  const submitBtn = document.getElementById('batchImportSubmit');
  const msgEl = document.getElementById('batchImportMsg');
  const progressEl = document.getElementById('batchImportProgress');
  const progressBar = document.getElementById('batchProgressBar');
  const progressText = document.getElementById('batchProgressText');
  const closers = batchModal.querySelectorAll('[data-batch-folder-close]');

  let folderModels = [];

  function setMsg(text, isError, isSuccess) {
    if (!msgEl) return;
    msgEl.textContent = text || '';
    msgEl.classList.remove('error');
    msgEl.classList.remove('success');
    if (isError) msgEl.classList.add('error');
    if (isSuccess) msgEl.classList.add('success');
  }

  function openModal() {
    batchModal.classList.add('show');
    batchModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    batchModal.classList.remove('show');
    batchModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetState();
  }

  function resetState() {
    folderModels = [];
    if (preview) preview.classList.add('hidden');
    if (folderList) folderList.innerHTML = '';
    if (folderCountEl) folderCountEl.textContent = '0';
    if (modelCountEl) modelCountEl.textContent = '0';
    if (submitBtn) submitBtn.disabled = true;
    if (clearFoldersBtn) clearFoldersBtn.style.display = 'none';
    if (progressEl) progressEl.classList.add('hidden');
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '';
    setMsg('');
  }

  function getFolderName(path) {
    const parts = path.split(/[/\\]/);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i]) return parts[i];
    }
    return 'Unknown';
  }

  function getParentPath(path) {
    const parts = path.split(/[/\\]/);
    parts.pop();
    return parts.join('/');
  }

  function groupFilesByFolder(files) {
    const groups = new Map();
    Array.from(files).forEach((file) => {
      if (!file.name.toLowerCase().endsWith('.3mf')) return;
      const folderPath = getParentPath(file.webkitRelativePath || file.name);
      const folderName = getFolderName(file.webkitRelativePath || file.name);
      if (!groups.has(folderPath)) {
        groups.set(folderPath, { name: folderName, path: folderPath, files: [] });
      }
      groups.get(folderPath).files.push(file);
    });
    return Array.from(groups.values());
  }

  function renderPreview() {
    if (!folderList || !preview) return;
    folderList.innerHTML = '';
    folderModels.forEach((model, idx) => {
      const item = document.createElement('div');
      item.className = 'batch-folder-item pending';
      item.id = `batch-folder-${idx}`;

      const header = document.createElement('div');
      header.className = 'batch-folder-header';

      const nameEl = document.createElement('div');
      nameEl.className = 'batch-folder-name';
      nameEl.innerHTML = `<i class="fas fa-folder"></i> ${model.name}`;

      const countEl = document.createElement('span');
      countEl.className = 'batch-folder-count';
      countEl.textContent = `${model.files.length} 个文件`;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'manual-btn danger';
      removeBtn.style.cssText = 'padding:2px 8px;font-size:12px;';
      removeBtn.innerHTML = '<i class="fas fa-times"></i>';
      removeBtn.title = '移除此文件夹';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        folderModels.splice(idx, 1);
        renderPreview();
        if (submitBtn) submitBtn.disabled = folderModels.length === 0;
        if (clearFoldersBtn) clearFoldersBtn.style.display = folderModels.length > 0 ? '' : 'none';
      });

      header.appendChild(nameEl);
      header.appendChild(countEl);
      header.appendChild(removeBtn);

      const filesEl = document.createElement('div');
      filesEl.className = 'batch-folder-files';
      model.files.slice(0, 5).forEach((f) => {
        const fileTag = document.createElement('span');
        fileTag.className = 'batch-folder-file';
        fileTag.textContent = f.name;
        filesEl.appendChild(fileTag);
      });
      if (model.files.length > 5) {
        const more = document.createElement('span');
        more.className = 'batch-folder-file';
        more.textContent = `+${model.files.length - 5} 更多`;
        filesEl.appendChild(more);
      }

      const statusEl = document.createElement('div');
      statusEl.className = 'batch-folder-status';
      statusEl.id = `batch-status-${idx}`;

      item.appendChild(header);
      item.appendChild(filesEl);
      item.appendChild(statusEl);
      folderList.appendChild(item);
    });

    if (folderCountEl) folderCountEl.textContent = folderModels.length;
    if (modelCountEl) modelCountEl.textContent = folderModels.reduce((sum, m) => sum + m.files.length, 0);
    preview.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = folderModels.length === 0;
    if (clearFoldersBtn) clearFoldersBtn.style.display = folderModels.length > 0 ? '' : 'none';
  }

  async function parse3mfFilesForBatch(files) {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f));
    const res = await fetch('/api/manual/3mf/parse', { method: 'POST', body: fd });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || '解析失败');
    }
    const data = await res.json();
    return data && data.draft ? data.draft : null;
  }

  async function importModel(model, idx) {
    try {
      const draft = await parse3mfFilesForBatch(model.files);
      if (!draft) throw new Error('解析结果为空');

      const fd = new FormData();
      fd.append('title', draft.title || model.name);
      fd.append('draft_session_id', draft.sessionId || '');
      fd.append('draft_instance_overrides', JSON.stringify((draft.instances || []).map(() => ({ enabled: true, title: '', summary: '' }))));
      fd.append('summary', draft.summary || '');
      fd.append('summary_html', draft.summaryHtml || '');

      const res = await fetch('/api/models/manual', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || '导入失败');
      }
      return { success: true, idx, title: draft.title || model.name };
    } catch (err) {
      return { success: false, idx, error: err.message || '未知错误' };
    }
  }

  function updateProgress(current, total, status) {
    const percent = Math.round((current / total) * 100);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = status || `正在导入: ${current}/${total} (${percent}%)`;
  }

  function updateItemStatus(idx, success, error, title) {
    const item = document.getElementById(`batch-folder-${idx}`);
    const statusEl = document.getElementById(`batch-status-${idx}`);
    if (item) {
      item.classList.remove('pending');
      item.classList.add(success ? 'success' : 'error');
    }
    if (statusEl) {
      statusEl.className = `batch-folder-status ${success ? 'success' : 'error'}`;
      if (success) {
        statusEl.textContent = `✓ ${title || '导入成功'}`;
      } else {
        statusEl.textContent = `✗ ${error || '导入失败'}`;
      }
    }
  }

  async function startBatchImport() {
    if (!folderModels.length) return;
    if (submitBtn) submitBtn.disabled = true;
    if (selectFolderBtn) selectFolderBtn.disabled = true;
    if (clearFoldersBtn) clearFoldersBtn.disabled = true;
    if (progressEl) progressEl.classList.remove('hidden');
    setMsg('开始批量导入...');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < folderModels.length; i++) {
      const model = folderModels[i];
      updateProgress(i, folderModels.length, `正在解析: ${model.name} (${i + 1}/${folderModels.length})`);
      
      const result = await importModel(model, i);
      if (result.success) {
        successCount++;
        updateItemStatus(i, true, null, result.title);
      } else {
        failCount++;
        updateItemStatus(i, false, result.error);
      }
      updateProgress(i + 1, folderModels.length, `已完成: ${i + 1}/${folderModels.length}`);
    }

    setMsg(
      failCount > 0 
        ? `导入完成：成功 ${successCount} 个，失败 ${failCount} 个` 
        : `导入完成：成功导入 ${successCount} 个模型`,
      failCount > 0,
      failCount === 0
    );

    if (successCount > 0) {
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      if (submitBtn) submitBtn.disabled = false;
      if (selectFolderBtn) selectFolderBtn.disabled = false;
      if (clearFoldersBtn) clearFoldersBtn.disabled = false;
    }
  }

  if (batchBtn) batchBtn.addEventListener('click', openModal);
  closers.forEach((btn) => btn.addEventListener('click', closeModal));
  batchModal.addEventListener('click', (e) => {
    if (e.target === batchModal) closeModal();
  });

  if (selectFolderBtn && folderPicker) {
    selectFolderBtn.addEventListener('click', () => folderPicker.click());
    folderPicker.addEventListener('change', () => {
      const files = folderPicker.files;
      if (!files || !files.length) return;
      const newFolders = groupFilesByFolder(files);
      if (newFolders.length === 0) {
        setMsg('所选文件夹中没有找到 .3mf 文件', true);
      } else {
        folderModels = folderModels.concat(newFolders);
        renderPreview();
        setMsg(`已添加 ${newFolders.length} 个文件夹`, false, true);
      }
      folderPicker.value = '';
    });
  }

  if (clearFoldersBtn) {
    clearFoldersBtn.addEventListener('click', () => {
      folderModels = [];
      renderPreview();
      setMsg('已清空文件夹列表');
    });
  }

  if (dropZone) {
    dropZone.addEventListener('click', () => {
      if (folderPicker) folderPicker.click();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      const items = e.dataTransfer.items;
      if (!items) {
        setMsg('您的浏览器不支持拖放文件夹功能', true);
        return;
      }

      const folderPromises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item && item.isDirectory) {
          folderPromises.push(readDirectory(item));
        }
      }

      if (folderPromises.length === 0) {
        setMsg('请拖放文件夹，而不是文件', true);
        return;
      }

      setMsg('正在扫描文件夹...');
      
      try {
        const folderFilesArrays = await Promise.all(folderPromises);
        let addedCount = 0;
        
        folderFilesArrays.forEach((files) => {
          const newFolders = groupFilesByFolder(files);
          if (newFolders.length > 0) {
            folderModels = folderModels.concat(newFolders);
            addedCount += newFolders.length;
          }
        });

        if (addedCount === 0) {
          setMsg('拖放的文件夹中没有找到 .3mf 文件', true);
        } else {
          renderPreview();
          setMsg(`已添加 ${addedCount} 个文件夹`, false, true);
        }
      } catch (err) {
        setMsg(`扫描文件夹失败：${err.message || err}`, true);
      }
    });
  }

  async function readDirectory(entry) {
    const files = [];
    
    async function readEntry(currentEntry, path) {
      if (currentEntry.isFile) {
        return new Promise((resolve) => {
          currentEntry.file((file) => {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: path + file.name,
              writable: false
            });
            resolve([file]);
          }, () => resolve([]));
        });
      } else if (currentEntry.isDirectory) {
        const reader = currentEntry.createReader();
        const entries = await new Promise((resolve) => {
          reader.readEntries(resolve, () => resolve([]));
        });
        const subFiles = [];
        for (const subEntry of entries) {
          const subFilesArray = await readEntry(subEntry, path + currentEntry.name + '/');
          subFiles.push(...subFilesArray);
        }
        return subFiles;
      }
      return [];
    }

    const result = await readEntry(entry, '');
    return result;
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', startBatchImport);
  }
})();

