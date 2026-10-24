"use client";

import { useState } from "react";
import {
  ExternalLink,
  Settings,
  Trash2,
  Users,
  X,
  Save,
  UserPlus,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

function compressSchoolImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(e.target?.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = String(e.target?.result || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Ô dán ảnh Ctrl + V hoặc chọn ảnh cho Trường học
export function SchoolImagePasteInput({
  defaultImage = "",
  inputName = "image_url",
}: {
  defaultImage?: string;
  inputName?: string;
}) {
  const [imageData, setImageData] = useState<string>(defaultImage);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setLoading(true);
    try {
      const compressed = await compressSchoolImage(file);
      setImageData(compressed);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) await handleFile(file);
        return;
      }
    }
  };

  return (
    <div>
      <label className="font-semibold text-slate-700 block mb-1">
        Ảnh / Logo Trường (Copy ảnh & bấm Ctrl + V hoặc Chọn ảnh)
      </label>
      <input type="hidden" name={inputName} value={imageData} />

      {!imageData ? (
        <div
          tabIndex={0}
          onPaste={handlePaste}
          className="w-full p-2.5 border-2 border-dashed border-teal-300 bg-teal-50/30 hover:bg-teal-50/70 focus:border-[#0F766E] rounded-2xl flex items-center justify-between gap-2 cursor-pointer outline-none transition"
        >
          <div className="flex items-center gap-2 text-slate-600 pl-1">
            <ImageIcon className="w-4 h-4 text-[#0F766E] shrink-0" />
            <span className="text-[11px] font-medium">
              {loading
                ? "Đang xử lý ảnh..."
                : "Click vào đây rồi bấm Ctrl + V để dán ảnh trường"}
            </span>
          </div>

          <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-[#0F766E] hover:bg-slate-50 cursor-pointer shrink-0 shadow-2xs">
            Chọn ảnh
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 p-2 border border-teal-300 bg-teal-50/40 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <img
              src={imageData}
              alt="Ảnh trường"
              className="w-11 h-11 rounded-xl object-cover border border-slate-200 shadow-2xs"
            />
            <span className="text-xs font-bold text-[#0F766E] inline-flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Đã gắn ảnh trường!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setImageData("")}
            className="p-1.5 rounded-xl bg-white border border-slate-200 text-red-600 hover:bg-red-50 cursor-pointer"
            title="Gỡ ảnh này"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function GodSchoolCardClient({
  school,
  onUpdateSchool,
  onAddSubAdmin,
  onRemoveSubAdmin,
  onDeleteSchool,
}: {
  school: any;
  onUpdateSchool: (formData: FormData) => Promise<void>;
  onAddSubAdmin: (formData: FormData) => Promise<void>;
  onRemoveSubAdmin: (formData: FormData) => Promise<void>;
  onDeleteSchool: (formData: FormData) => Promise<void>;
}) {
  const [openModal, setOpenModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subAdmins: string[] = Array.isArray(school.sub_admin_emails)
    ? school.sub_admin_emails
    : [];

  return (
    <>
      {/* Thẻ Trường ngoài danh sách: Có hiển thị Ảnh/Logo trường mềm mại */}
      <div
        onClick={() => setOpenModal(true)}
        className="p-4 rounded-3xl border border-slate-200/90 hover:border-[#0F766E] bg-white flex flex-col justify-between gap-3.5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg group"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              {school.image_url ? (
                <img
                  src={school.image_url}
                  alt={school.short_name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="min-w-12 h-12 px-2.5 rounded-2xl bg-gradient-to-br from-[#0F766E] to-teal-500 text-white font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                  {school.short_name}
                </div>
              )}

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold bg-teal-50 text-[#0F766E] px-2 py-0.5 rounded-lg">
                    /{school.slug}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    ({school.short_name})
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#0F766E] transition line-clamp-1 mt-0.5">
                  {school.name}
                </h3>
              </div>
            </div>

            <span className="text-[11px] font-bold text-slate-400 group-hover:text-[#0F766E] inline-flex items-center gap-1 shrink-0">
              <Settings className="w-3.5 h-3.5" />
              <span>Sửa</span>
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-1 text-[11px]">
            <p className="text-slate-600 truncate">
              🛡️ Admin chính:{" "}
              <strong className="text-slate-900">
                {school.campus_lead_email ?? "Chưa gán"}
              </strong>
            </p>
            <p className="text-slate-600 truncate">
              🛠️ Phó Admin:{" "}
              <strong className="text-indigo-600">
                {subAdmins.length > 0
                  ? `${subAdmins.length} người (${subAdmins.join(", ")})`
                  : "Chưa có"}
              </strong>
            </p>
          </div>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs"
        >
          <a
            href={`/${school.slug}`}
            className="font-bold text-[#0F766E] hover:underline inline-flex items-center gap-1"
          >
            <span>Vào căn tin</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <a
            href={`/${school.slug}/admin`}
            className="font-bold text-slate-600 hover:text-slate-900 hover:underline"
          >
            Quản lý món →
          </a>
        </div>
      </div>

      {/* CỬA SỔ POPUP CHI TIẾT TRƯỜNG TRONG GOD MODE */}
      {openModal && (
        <div
          onClick={() => {
            setOpenModal(false);
            setConfirmDelete(false);
          }}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] overflow-y-auto text-xs"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                {school.image_url ? (
                  <img
                    src={school.image_url}
                    alt={school.short_name}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-[#0F766E] text-white font-extrabold flex items-center justify-center">
                    {school.short_name}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold bg-teal-50 text-[#0F766E] px-2.5 py-0.5 rounded-lg">
                      foodhub.vn/{school.slug}
                    </span>
                  </div>
                  <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
                    {school.name}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* PHẦN 1: CHỈNH SỬA THÔNG TIN TRƯỜNG + ẢNH TRƯỜNG */}
            <form
              action={async (fd) => {
                await onUpdateSchool(fd);
                setOpenModal(false);
              }}
              className="space-y-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-200"
            >
              <input type="hidden" name="school_id" value={school.id} />
              <p className="font-extrabold text-sm text-slate-900">
                1. Chỉnh sửa thông tin, Ảnh trường & Admin chính
              </p>

              <SchoolImagePasteInput
                defaultImage={school.image_url || ""}
                inputName="image_url"
              />

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên đầy đủ của trường *
                </label>
                <input
                  name="name"
                  required
                  defaultValue={school.name}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tên viết tắt (Short Name) *
                  </label>
                  <input
                    name="short_name"
                    required
                    defaultValue={school.short_name}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Đường dẫn (Slug) *
                  </label>
                  <input
                    name="slug"
                    required
                    defaultValue={school.slug}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Gmail Admin Chính (Trưởng trường)
                </label>
                <input
                  name="campus_lead_email"
                  type="email"
                  defaultValue={school.campus_lead_email || ""}
                  placeholder="Chưa gán Gmail Admin chính"
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white font-bold rounded-xl inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Lưu cập nhật thông tin & Ảnh trường</span>
              </button>
            </form>

            {/* PHẦN 2: DANH SÁCH PHÓ ADMIN */}
            <div className="space-y-3 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-200/80">
              <div className="flex items-center gap-1.5 font-extrabold text-sm text-indigo-950">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>
                  2. Danh sách Phó Admin của trường ({subAdmins.length})
                </span>
              </div>

              {subAdmins.length === 0 ? (
                <p className="text-slate-500 italic">
                  Trường này hiện chưa có Phó Admin nào.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subAdmins.map((email) => (
                    <div
                      key={email}
                      className="inline-flex items-center gap-2 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl font-semibold text-slate-800"
                    >
                      <span>🛠️ {email}</span>
                      <form action={onRemoveSubAdmin}>
                        <input
                          type="hidden"
                          name="school_id"
                          value={school.id}
                        />
                        <input type="hidden" name="sub_email" value={email} />
                        <button
                          type="submit"
                          title="Gỡ Phó Admin này"
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              )}

              <form action={onAddSubAdmin} className="flex gap-2 pt-1">
                <input type="hidden" name="school_id" value={school.id} />
                <input
                  name="sub_email"
                  type="email"
                  required
                  placeholder="Thêm Gmail Phó Admin mới..."
                  className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl font-semibold"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Thêm Phó Admin</span>
                </button>
              </form>
            </div>

            {/* PHẦN 3: XÓA TRƯỜNG */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl font-bold transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa trường {school.short_name} khỏi hệ thống</span>
                </button>
              ) : (
                <div className="w-full p-3.5 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-red-800 font-bold">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Chắc chắn xóa vĩnh viễn trường {school.short_name} và toàn
                      bộ món ăn?
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <form
                      action={async (fd) => {
                        await onDeleteSchool(fd);
                        setOpenModal(false);
                      }}
                    >
                      <input
                        type="hidden"
                        name="school_id"
                        value={school.id}
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold cursor-pointer"
                      >
                        Xác nhận Xóa trường
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}