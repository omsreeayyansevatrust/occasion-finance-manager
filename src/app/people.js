import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { COLORS, FONTS } from "../constants/theme";
import { db } from "../services/firebase";

const PERSON_TYPES = [
  "Volunteer",
  "Donor",
  "Trustee",
  "Other",
];

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export default function PeopleScreen() {
  const [people, setPeople] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    dob: "",
    bloodGroup: "",
    email: "",
    type: "Volunteer",
    address: "",
    status: "Active",
  });

  // ==================================================
  // FIREBASE
  // ==================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "people"),
      (snapshot) => {
        const data = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        setPeople(data);
        setLoading(false);
      },
      (error) => {
        console.log(
          "People error:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ==================================================
  // FORM RESET
  // ==================================================

  const resetForm = () => {
    setForm({
      name: "",
      mobile: "",
      dob: "",
      bloodGroup: "",
      email: "",
      type: "Volunteer",
      address: "",
      status: "Active",
    });

    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (person) => {
    setEditingId(person.id);

    setForm({
      name: person.name || "",
      mobile: person.mobile || "",
      dob: person.dob || "",
      bloodGroup:
        person.bloodGroup || "",
      email: person.email || "",
      type: person.type || "Volunteer",
      address: person.address || "",
      status: person.status || "Active",
    });

    setModalVisible(true);
  };

  // ==================================================
  // MOBILE VALIDATION
  // ==================================================

  const validateMobile = (mobile) => {
    const cleaned = String(
      mobile || ""
    ).replace(/\D/g, "");

    return /^[6-9]\d{9}$/.test(
      cleaned
    );
  };

  // ==================================================
  // DOB VALIDATION
  // ==================================================

  const validateDOB = (dob) => {
    if (!dob.trim()) {
      return true;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        dob
      )
    ) {
      return false;
    }

    const date = new Date(
      `${dob}T00:00:00`
    );

    if (
      Number.isNaN(date.getTime())
    ) {
      return false;
    }

    const today = new Date();

    if (date > today) {
      return false;
    }

    return true;
  };

  // ==================================================
  // SAVE PERSON
  // ==================================================

  const savePerson = async () => {
    const name =
      form.name.trim();

    const mobile =
      form.mobile
        .replace(/\D/g, "")
        .trim();

    const dob =
      form.dob.trim();

    // NAME

    if (!name) {
      Alert.alert(
        "Required",
        "Please enter the person's name."
      );

      return;
    }

    // MOBILE

    if (!mobile) {
      Alert.alert(
        "Mobile Required",
        "Mobile number is mandatory."
      );

      return;
    }

    if (!validateMobile(mobile)) {
      Alert.alert(
        "Invalid Mobile",
        "Please enter a valid 10-digit Indian mobile number."
      );

      return;
    }

    // DOB

    if (!validateDOB(dob)) {
      Alert.alert(
        "Invalid Date of Birth",
        "Please enter DOB in YYYY-MM-DD format and make sure it is not a future date."
      );

      return;
    }

    // TYPE

    if (!form.type) {
      Alert.alert(
        "Required",
        "Please select a person type."
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        name,
        mobile,
        dob,
        bloodGroup:
          form.bloodGroup || "",
        email:
          form.email.trim(),
        type: form.type,
        address:
          form.address.trim(),
        status: form.status,
        updatedAt:
          serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "people",
            editingId
          ),
          payload
        );
      } else {
        await addDoc(
          collection(db, "people"),
          {
            ...payload,
            createdAt:
              serverTimestamp(),
          }
        );
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.log(
        "Save person error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to save the person. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==================================================
  // DELETE
  // ==================================================

  const confirmDelete = (
    person
  ) => {
    if (
      typeof window !==
        "undefined" &&
      typeof window.confirm ===
        "function"
    ) {
      const confirmed =
        window.confirm(
          `Are you sure you want to delete "${person.name}"?`
        );

      if (confirmed) {
        deletePerson(
          person.id
        );
      }

      return;
    }

    Alert.alert(
      "Delete Person",
      `Are you sure you want to delete "${person.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deletePerson(
              person.id
            ),
        },
      ]
    );
  };

  const deletePerson = async (
    id
  ) => {
    try {
      console.log(
        "Deleting person:",
        id
      );

      await deleteDoc(
        doc(
          db,
          "people",
          id
        )
      );

      console.log(
        "Person deleted successfully:",
        id
      );
    } catch (error) {
      console.log(
        "Delete person error:",
        error
      );

      const message =
        error?.message ||
        "Unable to delete the person.";

      if (
        typeof window !==
          "undefined" &&
        typeof window.alert ===
          "function"
      ) {
        window.alert(message);
      } else {
        Alert.alert(
          "Error",
          message
        );
      }
    }
  };

  // ==================================================
  // FILTERED PEOPLE
  // ==================================================

  const filteredPeople =
    useMemo(() => {
      return people
        .filter((person) => {
          const searchText =
            search
              .trim()
              .toLowerCase();

          if (!searchText) {
            return true;
          }

          return (
            String(
              person.name || ""
            )
              .toLowerCase()
              .includes(
                searchText
              ) ||
            String(
              person.mobile || ""
            )
              .toLowerCase()
              .includes(
                searchText
              ) ||
            String(
              person.email || ""
            )
              .toLowerCase()
              .includes(
                searchText
              ) ||
            String(
              person.bloodGroup ||
                ""
            )
              .toLowerCase()
              .includes(
                searchText
              )
          );
        })
        .filter((person) => {
          if (
            typeFilter ===
            "All"
          ) {
            return true;
          }

          return (
            String(
              person.type ||
                "Other"
            ).toLowerCase() ===
            typeFilter.toLowerCase()
          );
        })
        .filter((person) => {
          if (
            statusFilter ===
            "All"
          ) {
            return true;
          }

          return (
            String(
              person.status ||
                "Active"
            ).toLowerCase() ===
            statusFilter.toLowerCase()
          );
        })
        .sort((a, b) =>
          String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            )
          )
        );
    }, [
      people,
      search,
      typeFilter,
      statusFilter,
    ]);

  // ==================================================
  // SUMMARY
  // ==================================================

  const activeCount =
    people.filter(
      (person) =>
        String(
          person.status ||
            "Active"
        ).toLowerCase() ===
        "active"
    ).length;

  const volunteerCount =
    people.filter(
      (person) =>
        String(
          person.type || ""
        ).toLowerCase() ===
        "volunteer"
    ).length;

  const donorCount =
    people.filter(
      (person) =>
        String(
          person.type || ""
        ).toLowerCase() ===
        "donor"
    ).length;

  const trusteeCount =
    people.filter(
      (person) =>
        String(
          person.type || ""
        ).toLowerCase() ===
        "trustee"
    ).length;

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading people...
        </Text>
      </View>
    );
  }

  // ==================================================
  // SCREEN
  // ==================================================

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerLeft
            }
          >
            <Text
              style={styles.eyebrow}
            >
              PEOPLE MANAGEMENT
            </Text>

            <Text
              style={styles.title}
            >
              People
            </Text>

            <Text
              style={styles.subtitle}
            >
              Manage volunteers,
              donors, trustees
              and other members
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.primaryButton
            }
            onPress={openNew}
          >
            <Text
              style={
                styles.primaryButtonIcon
              }
            >
              +
            </Text>

            <Text
              style={
                styles.primaryButtonText
              }
            >
              Add Person
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUMMARY */}

        <View
          style={
            styles.summaryGrid
          }
        >
          <SummaryCard
            label="TOTAL PEOPLE"
            value={people.length}
            icon="#"
            color={
              COLORS.primary
            }
          />

          <SummaryCard
            label="ACTIVE"
            value={activeCount}
            icon="✓"
            color={
              COLORS.success
            }
          />

          <SummaryCard
            label="VOLUNTEERS"
            value={
              volunteerCount
            }
            icon="V"
            color={
              COLORS.primary
            }
          />

          <SummaryCard
            label="DONORS"
            value={donorCount}
            icon="D"
            color={
              COLORS.success
            }
          />

          <SummaryCard
            label="TRUSTEES"
            value={
              trusteeCount
            }
            icon="T"
            color="#8B5CF6"
          />
        </View>

        {/* SEARCH */}

        <View
          style={styles.toolbar}
        >
          <View
            style={
              styles.searchBox
            }
          >
            <Text
              style={
                styles.searchIcon
              }
            >
              ⌕
            </Text>

            <TextInput
              value={search}
              onChangeText={
                setSearch
              }
              placeholder="Search name, mobile, email or blood group..."
              placeholderTextColor={
                COLORS.textMuted
              }
              style={
                styles.searchInput
              }
            />
          </View>
        </View>

        {/* PERSON TYPE */}

        <View
          style={
            styles.filterSection
          }
        >
          <Text
            style={
              styles.filterLabel
            }
          >
            PERSON TYPE
          </Text>

          <View
            style={
              styles.filterRow
            }
          >
            {[
              "All",
              ...PERSON_TYPES,
            ].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterButton,
                  typeFilter ===
                    type &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setTypeFilter(
                    type
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    typeFilter ===
                      type &&
                      styles.filterTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* STATUS */}

        <View
          style={
            styles.filterSection
          }
        >
          <Text
            style={
              styles.filterLabel
            }
          >
            STATUS
          </Text>

          <View
            style={
              styles.filterRow
            }
          >
            {[
              "All",
              "Active",
              "Inactive",
            ].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  statusFilter ===
                    status &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setStatusFilter(
                    status
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    statusFilter ===
                      status &&
                      styles.filterTextActive,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* RESULTS */}

        <View
          style={
            styles.resultHeader
          }
        >
          <Text
            style={
              styles.resultCount
            }
          >
            {filteredPeople.length}{" "}
            {filteredPeople.length ===
            1
              ? "person"
              : "people"}
          </Text>

          {(search ||
            typeFilter !==
              "All" ||
            statusFilter !==
              "All") && (
            <TouchableOpacity
              onPress={() => {
                setSearch("");
                setTypeFilter(
                  "All"
                );
                setStatusFilter(
                  "All"
                );
              }}
            >
              <Text
                style={
                  styles.clearText
                }
              >
                Clear filters
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* LIST */}

        {filteredPeople.length ===
        0 ? (
          <View
            style={
              styles.emptyCard
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Text
                style={
                  styles.emptyIconText
                }
              >
                #
              </Text>
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No people found
            </Text>

            <Text
              style={
                styles.emptyDescription
              }
            >
              {search ||
              typeFilter !==
                "All" ||
              statusFilter !==
                "All"
                ? "Try changing your filters."
                : "Add your first volunteer, donor or trustee."}
            </Text>

            {!search &&
              typeFilter ===
                "All" &&
              statusFilter ===
                "All" && (
                <TouchableOpacity
                  style={
                    styles.emptyButton
                  }
                  onPress={
                    openNew
                  }
                >
                  <Text
                    style={
                      styles.emptyButtonText
                    }
                  >
                    Add Person
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        ) : (
          <View
            style={
              styles.peopleList
            }
          >
            {filteredPeople.map(
              (person) => (
                <PersonCard
                  key={
                    person.id
                  }
                  person={
                    person
                  }
                  onEdit={() =>
                    openEdit(
                      person
                    )
                  }
                  onDelete={() =>
                    confirmDelete(
                      person
                    )
                  }
                />
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* ==================================================
          ADD / EDIT MODAL
          ================================================== */}

      <Modal
        visible={
          modalVisible
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalVisible(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <ScrollView
            contentContainerStyle={
              styles.modalScroll
            }
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={styles.modal}
            >
              {/* HEADER */}

              <View
                style={
                  styles.modalHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.modalTitle
                    }
                  >
                    {editingId
                      ? "Edit Person"
                      : "Add Person"}
                  </Text>

                  <Text
                    style={
                      styles.modalSubtitle
                    }
                  >
                    Maintain the
                    person's
                    information
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.closeButton
                  }
                  onPress={() => {
                    setModalVisible(
                      false
                    );
                    resetForm();
                  }}
                >
                  <Text
                    style={
                      styles.closeText
                    }
                  >
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              {/* NAME */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Name *
              </Text>

              <TextInput
                value={
                  form.name
                }
                onChangeText={(
                  value
                ) =>
                  setForm({
                    ...form,
                    name: value,
                  })
                }
                placeholder="Enter full name"
                placeholderTextColor={
                  COLORS.textMuted
                }
                style={
                  styles.input
                }
              />

              {/* MOBILE */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Mobile Number *
              </Text>

              <TextInput
                value={
                  form.mobile
                }
                onChangeText={(
                  value
                ) => {
                  const cleaned =
                    value.replace(
                      /\D/g,
                      ""
                    );

                  setForm({
                    ...form,
                    mobile:
                      cleaned.slice(
                        0,
                        10
                      ),
                  });
                }}
                placeholder="10-digit mobile number"
                placeholderTextColor={
                  COLORS.textMuted
                }
                keyboardType="phone-pad"
                maxLength={10}
                style={
                  styles.input
                }
              />

              <Text
                style={
                  styles.helperText
                }
              >
                Mobile number is
                mandatory
              </Text>

              {/* DOB / BLOOD GROUP */}

              <View
                style={
                  styles.formRow
                }
              >
                <View
                  style={
                    styles.formHalf
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Date of Birth
                  </Text>

                  <TextInput
                    value={
                      form.dob
                    }
                    onChangeText={(
                      value
                    ) =>
                      setForm({
                        ...form,
                        dob: value,
                      })
                    }
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={
                      COLORS.textMuted
                    }
                    maxLength={10}
                    style={
                      styles.input
                    }
                  />
                </View>

                <View
                  style={
                    styles.formHalf
                  }
                >
                  <Text
                    style={
                      styles.fieldLabel
                    }
                  >
                    Blood Group
                  </Text>

                  <View
                    style={
                      styles.bloodGrid
                    }
                  >
                    {BLOOD_GROUPS.map(
                      (
                        blood
                      ) => (
                        <TouchableOpacity
                          key={
                            blood
                          }
                          style={[
                            styles.bloodOption,
                            form.bloodGroup ===
                              blood &&
                              styles.bloodOptionActive,
                          ]}
                          onPress={() =>
                            setForm(
                              {
                                ...form,
                                bloodGroup:
                                  blood,
                              }
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.bloodText,
                              form.bloodGroup ===
                                blood &&
                                styles.bloodTextActive,
                            ]}
                          >
                            {
                              blood
                            }
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                </View>
              </View>

              {/* EMAIL */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Email
              </Text>

              <TextInput
                value={
                  form.email
                }
                onChangeText={(
                  value
                ) =>
                  setForm({
                    ...form,
                    email: value,
                  })
                }
                placeholder="Email address"
                placeholderTextColor={
                  COLORS.textMuted
                }
                keyboardType="email-address"
                autoCapitalize="none"
                style={
                  styles.input
                }
              />

              {/* PERSON TYPE */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Person Type *
              </Text>

              <View
                style={
                  styles.typeGrid
                }
              >
                {PERSON_TYPES.map(
                  (type) => (
                    <TouchableOpacity
                      key={
                        type
                      }
                      style={[
                        styles.typeOption,
                        form.type ===
                          type &&
                          styles.typeOptionActive,
                      ]}
                      onPress={() =>
                        setForm({
                          ...form,
                          type,
                        })
                      }
                    >
                      <View
                        style={[
                          styles.typeRadio,
                          form.type ===
                            type &&
                            styles.typeRadioActive,
                        ]}
                      >
                        {form.type ===
                          type && (
                          <View
                            style={
                              styles.typeRadioDot
                            }
                          />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.typeOptionText,
                          form.type ===
                            type &&
                            styles.typeOptionTextActive,
                        ]}
                      >
                        {
                          type
                        }
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* ADDRESS */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Address
              </Text>

              <TextInput
                value={
                  form.address
                }
                onChangeText={(
                  value
                ) =>
                  setForm({
                    ...form,
                    address:
                      value,
                  })
                }
                placeholder="Optional address"
                placeholderTextColor={
                  COLORS.textMuted
                }
                multiline
                numberOfLines={2}
                style={[
                  styles.input,
                  styles.addressInput,
                ]}
              />

              {/* STATUS */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Status
              </Text>

              <View
                style={
                  styles.statusSelector
                }
              >
                {[
                  "Active",
                  "Inactive",
                ].map(
                  (status) => (
                    <TouchableOpacity
                      key={
                        status
                      }
                      style={[
                        styles.statusOption,
                        form.status ===
                          status &&
                          styles.statusOptionActive,
                      ]}
                      onPress={() =>
                        setForm({
                          ...form,
                          status,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          form.status ===
                            status &&
                            styles.statusOptionTextActive,
                        ]}
                      >
                        {
                          status
                        }
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* ACTIONS */}

              <View
                style={
                  styles.modalActions
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelButton
                  }
                  onPress={() => {
                    setModalVisible(
                      false
                    );
                    resetForm();
                  }}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.saveButton
                  }
                  onPress={
                    savePerson
                  }
                  disabled={
                    saving
                  }
                >
                  {saving ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      {editingId
                        ? "Update Person"
                        : "Save Person"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ==================================================
// SUMMARY CARD
// ==================================================

function SummaryCard({
  label,
  value,
  icon,
  color,
}) {
  return (
    <View
      style={
        styles.summaryCard
      }
    >
      <View
        style={
          styles.summaryTop
        }
      >
        <Text
          style={
            styles.summaryLabel
          }
        >
          {label}
        </Text>

        <View
          style={[
            styles.summaryIcon,
            {
              backgroundColor:
                `${color}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.summaryIconText,
              {
                color,
              },
            ]}
          >
            {icon}
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.summaryValue
        }
      >
        {value}
      </Text>
    </View>
  );
}

// ==================================================
// PERSON CARD
// ==================================================

function PersonCard({
  person,
  onEdit,
  onDelete,
}) {
  const isActive =
    String(
      person.status ||
        "Active"
    ).toLowerCase() ===
    "active";

  const typeColors = {
    Volunteer:
      COLORS.primary,
    Donor:
      COLORS.success,
    Trustee:
      "#8B5CF6",
    Other:
      COLORS.textSecondary,
  };

  const typeColor =
    typeColors[
      person.type
    ] ||
    COLORS.textSecondary;

  return (
    <View
      style={
        styles.personCard
      }
    >
      {/* IDENTITY */}

      <View
        style={
          styles.personIdentity
        }
      >
        <View
          style={[
            styles.personAvatar,
            {
              backgroundColor:
                `${typeColor}18`,
            },
          ]}
        >
          <Text
            style={[
              styles.personAvatarText,
              {
                color:
                  typeColor,
              },
            ]}
          >
            {String(
              person.name ||
                "?"
            )
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <View
          style={
            styles.personInfo
          }
        >
          <View
            style={
              styles.personNameRow
            }
          >
            <Text
              style={
                styles.personName
              }
              numberOfLines={
                1
              }
            >
              {person.name ||
                "Unnamed Person"}
            </Text>

            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor:
                    `${typeColor}18`,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color:
                      typeColor,
                  },
                ]}
              >
                {person.type ||
                  "Other"}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.personDetails
            }
          >
            {person.mobile ? (
              <Text
                style={
                  styles.detailText
                }
              >
                {person.mobile}
              </Text>
            ) : null}

            {person.dob ? (
              <Text
                style={
                  styles.detailText
                }
              >
                DOB:{" "}
                {person.dob}
              </Text>
            ) : null}

            {person.bloodGroup ? (
              <View
                style={
                  styles.bloodBadge
                }
              >
                <Text
                  style={
                    styles.bloodBadgeText
                  }
                >
                  {person.bloodGroup}
                </Text>
              </View>
            ) : null}

            {person.email ? (
              <Text
                style={
                  styles.detailText
                }
                numberOfLines={
                  1
                }
              >
                {person.email}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* STATUS */}

      <View
        style={
          styles.personStatus
        }
      >
        <View
          style={[
            styles.statusBadge,
            isActive
              ? styles.activeBadge
              : styles.inactiveBadge,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isActive
                ? styles.activeDot
                : styles.inactiveDot,
            ]}
          />

          <Text
            style={[
              styles.statusBadgeText,
              isActive
                ? styles.activeText
                : styles.inactiveText,
            ]}
          >
            {isActive
              ? "ACTIVE"
              : "INACTIVE"}
          </Text>
        </View>
      </View>

      {/* ACTIONS */}

      <View
        style={
          styles.cardActions
        }
      >
        <TouchableOpacity
          style={
            styles.actionButton
          }
          onPress={
            onEdit
          }
        >
          <Text
            style={
              styles.actionButtonText
            }
          >
            Edit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.deleteAction,
          ]}
          onPress={
            onDelete
          }
        >
          <Text
            style={
              styles.deleteActionText
            }
          >
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 50,
  },

  // -----------------------------------------------
  // LOADING
  // -----------------------------------------------

  loading: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    justifyContent:
      "center",
    alignItems: "center",
  },

  loadingText: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginTop: 10,
  },

  // -----------------------------------------------
  // HEADER
  // -----------------------------------------------

  header: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-end",
    marginBottom: 24,
  },

  headerLeft: {
    flex: 1,
  },

  eyebrow: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color:
      COLORS.primary,
  },

  title: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 30,
    color:
      COLORS.text,
    marginTop: 4,
  },

  subtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginTop: 4,
  },

  primaryButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor:
      COLORS.primary,
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  primaryButtonIcon: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color: "#FFFFFF",
    marginRight: 7,
  },

  primaryButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 12,
    color: "#FFFFFF",
  },

  // -----------------------------------------------
  // SUMMARY
  // -----------------------------------------------

  summaryGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 14,
    marginBottom: 18,
  },

  summaryCard: {
    flex: 1,
    minWidth: 170,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 17,
  },

  summaryTop: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  summaryLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
  },

  summaryIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  summaryIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
  },

  summaryValue: {
    fontFamily:
      FONTS.extraBold,
    fontSize: 22,
    color:
      COLORS.text,
    marginTop: 12,
  },

  // -----------------------------------------------
  // SEARCH
  // -----------------------------------------------

  toolbar: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 12,
    marginBottom: 14,
  },

  searchBox: {
    height: 40,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 10,
  },

  searchIcon: {
    fontSize: 18,
    color:
      COLORS.textMuted,
    marginRight: 7,
  },

  searchInput: {
    flex: 1,
    height: 38,
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.text,
    outlineStyle:
      "none",
  },

  // -----------------------------------------------
  // FILTERS
  // -----------------------------------------------

  filterSection: {
    marginBottom: 12,
  },

  filterLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 9,
    letterSpacing: 0.7,
    color:
      COLORS.textMuted,
    marginBottom: 7,
  },

  filterRow: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 7,
  },

  filterButton: {
    paddingHorizontal: 13,
    height: 34,
    borderRadius: 8,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      "#F1F5F9",
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.primary,
  },

  filterText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  filterTextActive: {
    fontFamily:
      FONTS.semiBold,
    color: "#FFFFFF",
  },

  // -----------------------------------------------
  // RESULTS
  // -----------------------------------------------

  resultHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    marginTop: 5,
    marginBottom: 10,
  },

  resultCount: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  clearText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.primary,
  },

  // -----------------------------------------------
  // PEOPLE
  // -----------------------------------------------

  peopleList: {
    gap: 12,
  },

  personCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 17,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  personIdentity: {
    flex: 1,
    flexDirection:
      "row",
    alignItems:
      "center",
    minWidth: 0,
  },

  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  personAvatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 17,
  },

  personInfo: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },

  personNameRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  personName: {
    fontFamily:
      FONTS.bold,
    fontSize: 14,
    color:
      COLORS.text,
    maxWidth: 300,
  },

  typeBadge: {
    marginLeft: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },

  typeBadgeText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
  },

  personDetails: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    alignItems:
      "center",
    marginTop: 5,
    gap: 12,
  },

  detailText: {
    fontFamily:
      FONTS.regular,
    fontSize: 10,
    color:
      COLORS.textMuted,
  },

  bloodBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor:
      "#FEF2F2",
  },

  bloodBadgeText: {
    fontFamily:
      FONTS.bold,
    fontSize: 9,
    color:
      "#DC2626",
  },

  personStatus: {
    marginHorizontal: 15,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  activeBadge: {
    backgroundColor:
      "#DCFCE7",
  },

  inactiveBadge: {
    backgroundColor:
      "#F1F5F9",
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginRight: 5,
  },

  activeDot: {
    backgroundColor:
      COLORS.success,
  },

  inactiveDot: {
    backgroundColor:
      COLORS.textMuted,
  },

  statusBadgeText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 8,
    letterSpacing: 0.4,
  },

  activeText: {
    color:
      COLORS.success,
  },

  inactiveText: {
    color:
      COLORS.textMuted,
  },

  // -----------------------------------------------
  // ACTIONS
  // -----------------------------------------------

  cardActions: {
    flexDirection:
      "row",
    gap: 6,
  },

  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor:
      "#F1F5F9",
  },

  actionButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
  },

  deleteAction: {
    backgroundColor:
      "#FEF2F2",
  },

  deleteActionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.danger,
  },

  // -----------------------------------------------
  // EMPTY
  // -----------------------------------------------

  emptyCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 16,
    paddingVertical: 60,
    alignItems:
      "center",
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor:
      "#EEF2FF",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  emptyIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 22,
    color:
      COLORS.primary,
  },

  emptyTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 16,
    color:
      COLORS.text,
    marginTop: 14,
  },

  emptyDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginTop: 5,
    textAlign:
      "center",
  },

  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
  },

  emptyButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },

  // -----------------------------------------------
  // MODAL
  // -----------------------------------------------

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(15, 23, 42, 0.45)",
  },

  modalScroll: {
    flexGrow: 1,
    alignItems:
      "center",
    justifyContent:
      "center",
    padding: 20,
  },

  modal: {
    width: "100%",
    maxWidth: 680,
    backgroundColor:
      COLORS.surface,
    borderRadius: 18,
    padding: 24,
  },

  modalHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    marginBottom: 18,
  },

  modalTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 20,
    color:
      COLORS.text,
  },

  modalSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 11,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  closeText: {
    fontSize: 20,
    color:
      COLORS.textSecondary,
    lineHeight: 22,
  },

  // -----------------------------------------------
  // FORM
  // -----------------------------------------------

  fieldLabel: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 10,
    color:
      COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 11,
  },

  input: {
    height: 42,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.text,
    backgroundColor:
      "#FFFFFF",
    outlineStyle:
      "none",
  },

  helperText: {
    fontFamily:
      FONTS.regular,
    fontSize: 9,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  formRow: {
    flexDirection:
      "row",
    gap: 10,
  },

  formHalf: {
    flex: 1,
  },

  // -----------------------------------------------
  // BLOOD GROUP
  // -----------------------------------------------

  bloodGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 5,
  },

  bloodOption: {
    minWidth: 38,
    height: 30,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 7,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      "#FFFFFF",
  },

  bloodOptionActive: {
    backgroundColor:
      "#FEF2F2",
    borderColor:
      "#DC2626",
  },

  bloodText: {
    fontFamily:
      FONTS.medium,
    fontSize: 9,
    color:
      COLORS.textSecondary,
  },

  bloodTextActive: {
    fontFamily:
      FONTS.bold,
    color:
      "#DC2626",
  },

  // -----------------------------------------------
  // TYPE
  // -----------------------------------------------

  typeGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 8,
  },

  typeOption: {
    flex: 1,
    minWidth: 120,
    height: 40,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  typeOptionActive: {
    backgroundColor:
      "#EEF2FF",
    borderColor:
      COLORS.primary,
  },

  typeRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor:
      COLORS.border,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  typeRadioActive: {
    borderColor:
      COLORS.primary,
  },

  typeRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor:
      COLORS.primary,
  },

  typeOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 10,
    color:
      COLORS.textSecondary,
    marginLeft: 7,
  },

  typeOptionTextActive: {
    fontFamily:
      FONTS.semiBold,
    color:
      COLORS.primary,
  },

  // -----------------------------------------------
  // ADDRESS
  // -----------------------------------------------

  addressInput: {
    height: 65,
    paddingTop: 10,
    textAlignVertical:
      "top",
  },

  // -----------------------------------------------
  // STATUS
  // -----------------------------------------------

  statusSelector: {
    flexDirection:
      "row",
    gap: 8,
  },

  statusOption: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  statusOptionActive: {
    backgroundColor:
      "#EEF2FF",
    borderColor:
      COLORS.primary,
  },

  statusOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  statusOptionTextActive: {
    fontFamily:
      FONTS.semiBold,
    color:
      COLORS.primary,
  },

  // -----------------------------------------------
  // MODAL ACTIONS
  // -----------------------------------------------

  modalActions: {
    flexDirection:
      "row",
    justifyContent:
      "flex-end",
    gap: 9,
    marginTop: 22,
  },

  cancelButton: {
    height: 40,
    paddingHorizontal: 17,
    borderRadius: 9,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  cancelButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color:
      COLORS.textSecondary,
  },

  saveButton: {
    height: 40,
    minWidth: 120,
    paddingHorizontal: 17,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  saveButtonText: {
    fontFamily:
      FONTS.semiBold,
    fontSize: 11,
    color: "#FFFFFF",
  },
});