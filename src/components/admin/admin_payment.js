import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import "../../css/Adminpayment.css"

export default function AdminPayment() {
    const [data, setData] = useState([]);
    const [categoryName, setCategoryName] = useState("");
    const [subName, setSubName] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [openCategory, setOpenCategory] = useState(null);
    const [editingCat, setEditingCat] = useState(null);
    const [editingSub, setEditingSub] = useState(null);

    const toggleCategory = (id) => {
        setOpenCategory((prev) => (prev === id ? null : id));
    };
    // ============================
    // FETCH ALL
    // ============================
    const fetchData = async () => {
        const res = await fetch(`${API_BASE_URL}/api/admin/all`, {
            headers: {
                "admin-token": localStorage.getItem("admintoken"),
            },
        });

        const data = await res.json();

        if (data.success) {
            setData(data.data);
        }
    };
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, []);

    const addCategory = async () => {
        if (!categoryName) return alert("Enter category");

        const res = await fetch(`${API_BASE_URL}/api/admin/add-category`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "admin-token": localStorage.getItem("admintoken"),
            },
            body: JSON.stringify({
                name: categoryName,
            }),
        });

        const data = await res.json();

        if (data.success) {
            setCategoryName("");
            fetchData();
        } else {
            alert(data.error || "Error");
        }
    };

    const addSubCategory = async () => {
        if (!subName || !selectedCategory) return alert("Fill all fields");

        const res = await fetch(`${API_BASE_URL}/api/admin/add-subcategory`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "admin-token": localStorage.getItem("admintoken"),
            },
            body: JSON.stringify({
                name: subName,
                categoryId: selectedCategory,
            }),
        });

        const data = await res.json();

        if (data.success) {
            setSubName("");
            fetchData();
        } else {
            alert(data.error || "Error");
        }
    };
    // ============================
    // DELETE CATEGORY
    // ============================
    const deleteCategory = async (id) => {
        await fetch(`${API_BASE_URL}/api/admin/delete-category/${id}`, {
            method: "DELETE",
            headers: {
                "admin-token": localStorage.getItem("admintoken"),
            },
        });

        fetchData();
    };

    // ============================
    // DELETE SUBCATEGORY
    // ============================
    const deleteSubCategory = async (id) => {
        await fetch(`${API_BASE_URL}/api/admin/delete-subcategory/${id}`, {
            method: "DELETE",
            headers: {
                "admin-token": localStorage.getItem("admintoken"),
            },
        });

        fetchData();
    };

    const updateCategory = async () => {
        const res = await fetch(
            `${API_BASE_URL}/api/admin/update-category/${editingCat._id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "admin-token": localStorage.getItem("admintoken"),
                },
                body: JSON.stringify({
                    name: editingCat.name,
                }),
            },
        );

        const data = await res.json();

        if (data.success) {
            setEditingCat(null);
            fetchData();
        } else {
            alert(data.error || "Update failed");
        }
    };

    const updateSubCategory = async () => {
        const res = await fetch(
            `${API_BASE_URL}/api/admin/update-subcategory/${editingSub._id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "admin-token": localStorage.getItem("admintoken"),
                },
                body: JSON.stringify({
                    name: editingSub.name,
                }),
            },
        );

        const data = await res.json();

        if (data.success) {
            setEditingSub(null);
            fetchData();
        } else {
            alert(data.error || "Update failed");
        }
    };

    return (
        <div className="adm-root">
            {/* ── Page Header ── */}
            <div className="adm-page-header">
                <div className="adm-page-icon">💳</div>
                <div>
                    <div className="adm-page-title">
                        Payment <em>Methods</em>
                    </div>
                    <div className="adm-page-sub">
                        Manage categories & subcategories
                    </div>
                </div>
            </div>

            {/* ── Add Forms ── */}
            <div className="adm-top-grid">
                {/* Add Category */}
                <div className="adm-card">
                    <div className="adm-card-eyebrow">New Category</div>
                    <div className="adm-field">
                        <label className="adm-label">Category Name</label>
                        <input
                            className="adm-input"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="e.g. Bank Transfer"
                            onKeyDown={(e) =>
                                e.key === "Enter" && addCategory()
                            }
                        />
                    </div>
                    <button
                        className="adm-btn adm-btn-primary"
                        onClick={addCategory}
                    >
                        + Add Category
                    </button>
                </div>

                {/* Add Subcategory */}
                <div className="adm-card">
                    <div className="adm-card-eyebrow">New Subcategory</div>
                    <div className="adm-field">
                        <label className="adm-label">Parent Category</label>
                        <select
                            className="adm-select"
                            onChange={(e) =>
                                setSelectedCategory(e.target.value)
                            }
                            value={selectedCategory}
                        >
                            <option value="">Select Category</option>
                            {data.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                    {/* <span
                                        style={{ marginLeft: 6, fontSize: 10 }}
                                    ></span> */}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="adm-field">
                        <label className="adm-label">Subcategory Name</label>
                        <input
                            className="adm-input"
                            value={subName}
                            onChange={(e) => setSubName(e.target.value)}
                            placeholder="e.g. HDFC Bank"
                            onKeyDown={(e) =>
                                e.key === "Enter" && addSubCategory()
                            }
                        />
                    </div>
                    <button
                        className="adm-btn adm-btn-primary"
                        onClick={addSubCategory}
                    >
                        + Add Subcategory
                    </button>
                </div>
            </div>

            {/* ── Full List ── */}
            <div className="adm-list-card">
                <div className="adm-list-header">All Payment Methods</div>

                {data.length === 0 ? (
                    <div className="adm-empty">
                        No payment methods added yet
                    </div>
                ) : (
                    data.map((cat) => (
                        <div key={cat._id} className="adm-cat-block">
                            {/* Category row */}
                            <div
                                className="adm-cat-row"
                                onClick={() => toggleCategory(cat._id)}
                                style={{ cursor: "pointer" }}
                            >
                                {" "}
                                {editingCat?._id === cat._id ? (
                                    <div className="adm-inline-edit">
                                        <input
                                            className="adm-inline-input"
                                            value={editingCat.name}
                                            onChange={(e) =>
                                                setEditingCat({
                                                    ...editingCat,
                                                    name: e.target.value,
                                                })
                                            }
                                            onKeyDown={(e) =>
                                                e.key === "Enter" &&
                                                updateCategory()
                                            }
                                            autoFocus
                                        />
                                        <button
                                            className="adm-btn adm-btn-sm adm-btn-save"
                                            onClick={updateCategory}
                                        >
                                            Save
                                        </button>
                                        <button
                                            className="adm-btn adm-btn-sm adm-btn-del"
                                            onClick={() => setEditingCat(null)}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="adm-cat-name">
                                        <span className="adm-cat-dot" />
                                        {cat.name}
                                        <span
                                            style={{
                                                marginLeft: 6,
                                                fontSize: 10,
                                            }}
                                        >
                                            {openCategory === cat._id
                                                ? "▲"
                                                : "▼"}
                                        </span>
                                        <span className="adm-cat-count">
                                            {cat.subcategories?.length || 0} sub
                                        </span>
                                    </div>
                                )}
                                {editingCat?._id !== cat._id && (
                                    <div className="adm-cat-actions">
                                        <button
                                            className="adm-btn adm-btn-sm adm-btn-edit"
                                            onClick={() => setEditingCat(cat)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="adm-btn adm-btn-sm adm-btn-del"
                                            onClick={() =>
                                                deleteCategory(cat._id)
                                            }
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Subcategories */}
                            {cat.subcategories?.length > 0 &&
                                openCategory === cat._id && (
                                    <ul className="adm-sub-list">
                                        {cat.subcategories.map((sub) => (
                                            <li
                                                key={sub._id}
                                                className="adm-sub-item"
                                            >
                                                {editingSub?._id === sub._id ? (
                                                    <div className="adm-inline-edit">
                                                        <input
                                                            className="adm-inline-input"
                                                            value={
                                                                editingSub.name
                                                            }
                                                            onChange={(e) =>
                                                                setEditingSub({
                                                                    ...editingSub,
                                                                    name: e
                                                                        .target
                                                                        .value,
                                                                })
                                                            }
                                                            onKeyDown={(e) =>
                                                                e.key ===
                                                                    "Enter" &&
                                                                updateSubCategory()
                                                            }
                                                            autoFocus
                                                        />
                                                        <button
                                                            className="adm-btn adm-btn-sm adm-btn-save"
                                                            onClick={
                                                                updateSubCategory
                                                            }
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            className="adm-btn adm-btn-sm adm-btn-del"
                                                            onClick={() =>
                                                                setEditingSub(
                                                                    null,
                                                                )
                                                            }
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="adm-sub-name">
                                                            {sub.name}
                                                        </span>
                                                        <div className="adm-sub-actions">
                                                            <button
                                                                className="adm-btn adm-btn-sm adm-btn-edit"
                                                                onClick={() =>
                                                                    setEditingSub(
                                                                        sub,
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="adm-btn adm-btn-sm adm-btn-del"
                                                                onClick={() =>
                                                                    deleteSubCategory(
                                                                        sub._id,
                                                                    )
                                                                }
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
