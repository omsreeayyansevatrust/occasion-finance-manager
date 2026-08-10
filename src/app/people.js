import { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

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

import {
  uploadImageToCloudinary,
} from "../services/cloudinary";

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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [people, setPeople] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] =
    useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState("All");
  const [statusFilter, setStatusFilter] =
    useState("All");

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
    photoUrl: "",
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
      photoUrl: "",
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
      type:
        person.type || "Volunteer",
      address:
        person.address || "",
      status:
        person.status || "Active",
      photoUrl:
        person.photoUrl || "",
    });

    setModalVisible(true);
  };

  // ==================================================
  // PHOTO
  // ==================================================

  const pickPersonPhoto =
    async () => {
      try {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          permission.status !==
          "granted"
        ) {
          Alert.alert(
            "Permission Required",
            "Please allow photo library access to select a profile photo."
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes: [
                "images",
              ],
              allowsEditing:
                true,
              aspect: [1, 1],
              quality: 0.8,
            }
          );

        if (
          result.canceled
        ) {
          return;
        }

        const asset =
          result.assets?.[0];

        if (!asset) {
          return;
        }

        setUploadingPhoto(true);

        const uploaded =
          await uploadImageToCloudinary(
            asset,
            "occasionfinancemanager/people"
          );

        setForm(
          (current) => ({
            ...current,
            photoUrl:
              uploaded.url,
          })
        );

        Alert.alert(
          "Photo Uploaded",
          "Profile photo uploaded successfully."
        );
      } catch (error) {
        console.log(
          "Person photo upload error:",
          error
        );

        Alert.alert(
          "Photo Upload Failed",
          error?.message ||
            "Unable to upload the photo. Please try again."
        );
      } finally {
        setUploadingPhoto(
          false
        );
      }
    };

  const removePersonPhoto =
    () => {
      setForm(
        (current) => ({
          ...current,
          photoUrl: "",
        })
      );
    };

  // ==================================================
  // MOBILE VALIDATION
  // ==================================================

  const validateMobile = (
    mobile
  ) => {
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

  const validateDOB = (
    dob
  ) => {
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
      Number.isNaN(
        date.getTime()
      )
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

        // NEW
        photoUrl:
          form.photoUrl || "",

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
        contentContainerStyle={[
          styles.content,
          isMobile &&
            styles.contentMobile,
        ]}
      >
        {/* HEADER */}

        <View
          style={[
            styles.header,
            isMobile &&
              styles.headerMobile,
          ]}
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
            style={[
              styles.primaryButton,
              isMobile &&
                styles.primaryButtonMobile,
            ]}
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
          style={[
            styles.summaryGrid,
            isMobile &&
              styles.summaryGridMobile,
          ]}
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
            wide
          />
        </View>

        {/* SEARCH */}

        <View
          style={[
            styles.toolbar,
            isMobile &&
              styles.toolbarMobile,
          ]}
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
            style={[
              styles.filterRow,
              isMobile &&
                styles.filterRowMobile,
            ]}
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
            style={[
              styles.filterRow,
              isMobile &&
                styles.filterRowMobile,
            ]}
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
          style={[
            styles.resultHeader,
            isMobile &&
              styles.resultHeaderMobile,
          ]}
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
              style={[
                styles.modal,
                isMobile &&
                  styles.modalMobile,
              ]}
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

              {/* ==================================================
                  PROFILE PHOTO
                  ================================================== */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Profile Photo
              </Text>

              <View
                style={
                  styles.photoSection
                }
              >
                <View
                  style={
                    styles.photoPreview
                  }
                >
                  {form.photoUrl ? (
                    <Image
                      source={{
                        uri: form.photoUrl,
                      }}
                      style={
                        styles.photoImage
                      }
                    />
                  ) : (
                    <Text
                      style={
                        styles.photoPlaceholder
                      }
                    >
                      {form.name
                        ? form.name
                            .charAt(
                              0
                            )
                            .toUpperCase()
                        : "?"}
                    </Text>
                  )}
                </View>

                <View
                  style={
                    styles.photoActions
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.photoButton
                    }
                    onPress={
                      pickPersonPhoto
                    }
                    disabled={
                      uploadingPhoto ||
                      saving
                    }
                  >
                    {uploadingPhoto ? (
                      <View
                        style={
                          styles.photoLoadingContent
                        }
                      >
                        <ActivityIndicator
                          size="small"
                          color="#FFFFFF"
                        />

                        <Text
                          style={
                            styles.photoButtonText
                          }
                        >
                          Uploading...
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={
                          styles.photoButtonText
                        }
                      >
                        {form.photoUrl
                          ? "Change Photo"
                          : "Add Photo"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {form.photoUrl ? (
                    <TouchableOpacity
                      style={
                        styles.removePhotoButton
                      }
                      onPress={
                        removePersonPhoto
                      }
                      disabled={
                        uploadingPhoto ||
                        saving
                      }
                    >
                      <Text
                        style={
                          styles.removePhotoText
                        }
                      >
                        Remove Photo
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
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
                style={[
                  styles.modalActions,
                  isMobile &&
                    styles.modalActionsMobile,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    isMobile &&
                      styles.modalActionButtonMobile,
                  ]}
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
                  style={[
                    styles.saveButton,
                    isMobile &&
                      styles.modalActionButtonMobile,
                  ]}
                  onPress={
                    savePerson
                  }
                  disabled={
                    saving ||
                    uploadingPhoto
                  }
                >
                  {saving ? (
                    <View
                      style={
                        styles.saveLoadingContent
                      }
                    >
                      <ActivityIndicator
                        size="small"
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.saveButtonText
                        }
                      >
                        Saving...
                      </Text>
                    </View>
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
  wide = false,
}) {
  const { width } =
    useWindowDimensions();

  const isMobile =
    width < 768;

  return (
    <View
      style={[
        styles.summaryCard,
        isMobile &&
          styles.summaryCardMobile,
        isMobile &&
          wide &&
          styles.summaryCardMobileWide,
      ]}
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
          numberOfLines={1}
          adjustsFontSizeToFit
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
        style={[
          styles.summaryValue,
          isMobile &&
            styles.summaryValueMobile,
        ]}
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
  const { width } =
    useWindowDimensions();

  const isMobile =
    width < 768;

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
      style={[
        styles.personCard,
        isMobile &&
          styles.personCardMobile,
      ]}
    >
      {/* IDENTITY */}

      <View
        style={[
          styles.personIdentity,
          isMobile &&
            styles.personIdentityMobile,
        ]}
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
          {person.photoUrl ? (
            <Image
              source={{
                uri: person.photoUrl,
              }}
              style={
                styles.personAvatarImage
              }
            />
          ) : (
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
          )}
        </View>

        <View
          style={[
            styles.personInfo,
            isMobile &&
              styles.personInfoMobile,
          ]}
        >
          <View
            style={[
              styles.personNameRow,
              isMobile &&
                styles.personNameRowMobile,
            ]}
          >
            <Text
              style={
                styles.personName
              }
              numberOfLines={1}
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
                  {
                    person.bloodGroup
                  }
                </Text>
              </View>
            ) : null}

            {person.email ? (
              <Text
                style={
                  styles.detailText
                }
                numberOfLines={1}
              >
                {person.email}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* STATUS */}

      <View
        style={[
          styles.personStatus,
          isMobile &&
            styles.personStatusMobile,
        ]}
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
        style={[
          styles.cardActions,
          isMobile &&
            styles.cardActionsMobile,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionButton,
            isMobile &&
              styles.actionButtonMobile,
          ]}
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
            isMobile &&
              styles.actionButtonMobile,
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
  // ==================================================
  // PAGE
  // ==================================================

  container: {
    flex: 1,
    backgroundColor:
      COLORS.background,
  },

  contentMobile: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  content: {
    width: "100%",
    maxWidth: 1600,
    alignSelf: "center",
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 60,
  },

  loading: {
    flex: 1,
    backgroundColor:
      COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    fontFamily:
      FONTS.regular,
    fontSize: 14,
    color:
      COLORS.textSecondary,
    marginTop: 10,
  },

  // ==================================================
  // HEADER
  // ==================================================

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "flex-end",
    marginBottom: 26,
  },

  headerLeft: {
    flex: 1,
  },

  eyebrow: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    letterSpacing: 1.1,
    color:
      COLORS.primary,
  },

  title: {
    fontFamily:
      FONTS.bold,
    fontSize: 36,
    lineHeight: 43,
    color:
      COLORS.text,
    marginTop: 4,
  },

  subtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 16,
    lineHeight: 22,
    color:
      COLORS.textSecondary,
    marginTop: 5,
  },

  headerMobile: {
    flexDirection:
      "column",
    alignItems:
      "stretch",
    marginBottom: 20,
  },

  primaryButtonMobile: {
    alignSelf:
      "flex-start",
    marginLeft: 0,
    marginTop: 14,
    minHeight: 46,
    paddingHorizontal: 16,
  },

  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 19,
    borderRadius: 11,
    backgroundColor:
      COLORS.primary,
    flexDirection: "row",
    alignItems:
      "center",
    justifyContent:
      "center",
    marginLeft: 20,
  },

  primaryButtonIcon: {
    fontFamily:
      FONTS.bold,
    fontSize: 20,
    color: "#FFFFFF",
    marginRight: 8,
  },

  primaryButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  // ==================================================
  // SUMMARY
  // ==================================================

  summaryGridMobile: {
    gap: 12,
    marginBottom: 18,
  },

  summaryCardMobile: {
    flex: 0,
    width: "46%",
    minWidth: 0,
    minHeight: 118,
    padding: 15,
  },

  summaryCardMobileWide: {
    width: "100%",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },

  summaryCard: {
    flex: 1,
    minWidth: 190,
    minHeight: 142,
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 20,
  },

  summaryTop: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  summaryLabel: {
    flex: 1,
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    letterSpacing: 0.75,
    color:
      COLORS.textMuted,
    marginRight: 8,
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems:
      "center",
    justifyContent:
      "center",
    flexShrink: 0,
  },

  summaryIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 17,
  },

  summaryValue: {
    fontFamily:
      FONTS.bold,
    fontSize: 30,
    lineHeight: 37,
    color:
      COLORS.text,
    marginTop: 16,
  },

  summaryValueMobile: {
    fontSize: 27,
    lineHeight: 32,
    marginTop: 12,
  },

  // ==================================================
  // SEARCH
  // ==================================================

  toolbarMobile: {
    padding: 10,
    borderRadius: 13,
    marginBottom: 16,
  },

  toolbar: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    padding: 13,
    marginBottom: 18,
  },

  searchBox: {
    height: 48,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 10,
    flexDirection: "row",
    alignItems:
      "center",
    paddingHorizontal: 13,
    backgroundColor:
      COLORS.surface,
  },

  searchIcon: {
    fontFamily:
      FONTS.medium,
    fontSize: 20,
    color:
      COLORS.textMuted,
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    height: 46,
    fontFamily:
      FONTS.regular,
    fontSize: 15,
    color:
      COLORS.text,
    outlineStyle:
      "none",
  },

  // ==================================================
  // FILTERS
  // ==================================================

  filterSection: {
    marginBottom: 15,
  },

  filterLabel: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
    letterSpacing: 0.75,
    color:
      COLORS.textMuted,
    marginBottom: 8,
  },

  filterRowMobile: {
    gap: 7,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 9,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      "#F1F5F9",
    borderWidth: 1,
    borderColor:
      "#E7EDF5",
  },

  filterButtonActive: {
    backgroundColor:
      COLORS.primary,
    borderColor:
      COLORS.primary,
  },

  filterText: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.textSecondary,
  },

  filterTextActive: {
    fontFamily:
      FONTS.bold,
    color: "#FFFFFF",
  },

  // ==================================================
  // RESULTS
  // ==================================================

  resultHeaderMobile: {
    marginTop: 2,
    marginBottom: 10,
  },

  resultHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    marginTop: 6,
    marginBottom: 12,
  },

  resultCount: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.textSecondary,
  },

  clearText: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.primary,
  },

  // ==================================================
  // PEOPLE CARDS
  // ==================================================

  peopleList: {
    gap: 14,
  },

  personCardMobile: {
    minHeight: 0,
    paddingHorizontal: 15,
    paddingVertical: 15,
    flexDirection:
      "column",
    alignItems:
      "stretch",
  },

  personIdentityMobile: {
    width: "100%",
  },

  personInfoMobile: {
    marginLeft: 12,
  },

  personNameRowMobile: {
    flexWrap:
      "wrap",
  },

  personStatusMobile: {
    marginHorizontal: 0,
    marginTop: 12,
    alignSelf:
      "flex-start",
  },

  cardActionsMobile: {
    width: "100%",
    marginTop: 13,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor:
      COLORS.border,
    gap: 9,
  },

  actionButtonMobile: {
    flex: 1,
    minHeight: 42,
  },

  personCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 18,
    paddingVertical: 17,
    minHeight: 100,
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
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems:
      "center",
    justifyContent:
      "center",
    overflow: "hidden",
    flexShrink: 0,
  },

  personAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },

  personAvatarText: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
  },

  personInfo: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },

  personNameRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    flexWrap:
      "wrap",
  },

  personName: {
    fontFamily:
      FONTS.medium,
    fontSize: 16,
    lineHeight: 21,
    color:
      COLORS.text,
    maxWidth: 420,
  },

  typeBadge: {
    marginLeft: 9,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },

  typeBadgeText: {
    fontFamily:
      FONTS.medium,
    fontSize: 11,
  },

  personDetails: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    alignItems:
      "center",
    marginTop: 6,
    gap: 13,
  },

  detailText: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
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
      FONTS.medium,
    fontSize: 11,
    color:
      "#DC2626",
  },

  personStatus: {
    marginHorizontal: 16,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  activeBadge: {
    backgroundColor:
      COLORS.successLight,
  },

  inactiveBadge: {
    backgroundColor:
      "#F1F5F9",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    marginRight: 6,
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
      FONTS.medium,
    fontSize: 11,
    letterSpacing: 0.35,
  },

  activeText: {
    color:
      COLORS.success,
  },

  inactiveText: {
    color:
      COLORS.textMuted,
  },

  // ==================================================
  // ACTIONS
  // ==================================================

  cardActions: {
    flexDirection:
      "row",
    gap: 7,
  },

  actionButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  actionButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  deleteAction: {
    backgroundColor:
      COLORS.dangerLight,
  },

  deleteActionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.danger,
  },

  // ==================================================
  // EMPTY STATE
  // ==================================================

  emptyCard: {
    backgroundColor:
      COLORS.surface,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 15,
    paddingVertical: 64,
    paddingHorizontal: 28,
    alignItems:
      "center",
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor:
      COLORS.primaryLight,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  emptyIconText: {
    fontFamily:
      FONTS.bold,
    fontSize: 24,
    color:
      COLORS.primary,
  },

  emptyTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 18,
    color:
      COLORS.text,
    marginTop: 15,
  },

  emptyDescription: {
    fontFamily:
      FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
    color:
      COLORS.textMuted,
    marginTop: 6,
    textAlign:
      "center",
  },

  emptyButton: {
    marginTop: 17,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
  },

  emptyButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },

  // ==================================================
  // MODAL
  // ==================================================

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
    padding: 24,
  },

  modalMobile: {
    maxWidth: 520,
    borderRadius: 15,
    padding: 20,
  },

  modalActionsMobile: {
    flexDirection:
      "column-reverse",
    alignItems:
      "stretch",
  },

  modal: {
    width: "100%",
    maxWidth: 720,
    backgroundColor:
      COLORS.surface,
    borderRadius: 18,
    padding: 26,
  },

  modalHeader: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
    marginBottom: 19,
  },

  modalTitle: {
    fontFamily:
      FONTS.bold,
    fontSize: 23,
    lineHeight: 28,
    color:
      COLORS.text,
  },

  modalSubtitle: {
    fontFamily:
      FONTS.regular,
    fontSize: 13,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor:
      "#F1F5F9",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  closeText: {
    fontFamily:
      FONTS.regular,
    fontSize: 23,
    color:
      COLORS.textSecondary,
    lineHeight: 25,
  },

  // ==================================================
  // FORM
  // ==================================================

  fieldLabel: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginBottom: 7,
    marginTop: 13,
  },

  input: {
    height: 47,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 13,
    fontFamily:
      FONTS.regular,
    fontSize: 15,
    color:
      COLORS.text,
    backgroundColor:
      COLORS.surface,
    outlineStyle:
      "none",
  },

  helperText: {
    fontFamily:
      FONTS.regular,
    fontSize: 12,
    color:
      COLORS.textMuted,
    marginTop: 4,
  },

  formRow: {
    flexDirection:
      "row",
    gap: 12,
  },

  formHalf: {
    flex: 1,
    minWidth: 0,
  },

  // ==================================================
  // PHOTO
  // ==================================================

  photoSection: {
    flexDirection:
      "row",
    alignItems:
      "center",
    marginBottom: 4,
  },

  photoPreview: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor:
      COLORS.primaryLight,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    alignItems:
      "center",
    justifyContent:
      "center",
    overflow:
      "hidden",
    flexShrink: 0,
  },

  photoImage: {
    width: "100%",
    height: "100%",
  },

  photoPlaceholder: {
    fontFamily:
      FONTS.bold,
    fontSize: 28,
    color:
      COLORS.primary,
  },

  photoActions: {
    marginLeft: 15,
    gap: 8,
    flex: 1,
  },

  photoButton: {
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
    alignSelf:
      "flex-start",
  },

  photoLoadingContent: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: 8,
  },

  photoButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color: "#FFFFFF",
  },

  removePhotoButton: {
    minHeight: 36,
    paddingHorizontal: 15,
    borderRadius: 9,
    backgroundColor:
      COLORS.dangerLight,
    alignItems:
      "center",
    justifyContent:
      "center",
    alignSelf:
      "flex-start",
  },

  removePhotoText: {
    fontFamily:
      FONTS.medium,
    fontSize: 12,
    color:
      COLORS.danger,
  },

  // ==================================================
  // BLOOD GROUP
  // ==================================================

  bloodGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 6,
  },

  bloodOption: {
    minWidth: 42,
    height: 34,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 7,
    alignItems:
      "center",
    justifyContent:
      "center",
    backgroundColor:
      COLORS.surface,
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
    fontSize: 12,
    color:
      COLORS.textSecondary,
  },

  bloodTextActive: {
    fontFamily:
      FONTS.bold,
    color:
      "#DC2626",
  },

  // ==================================================
  // TYPE
  // ==================================================

  typeGrid: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    gap: 8,
  },

  typeOption: {
    flex: 1,
    minWidth: 130,
    height: 44,
    borderWidth: 1,
    borderColor:
      COLORS.border,
    borderRadius: 9,
    paddingHorizontal: 11,
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  typeOptionActive: {
    backgroundColor:
      COLORS.primaryLight,
    borderColor:
      COLORS.primary,
  },

  typeRadio: {
    width: 17,
    height: 17,
    borderRadius: 9,
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
    fontSize: 13,
    color:
      COLORS.textSecondary,
    marginLeft: 8,
  },

  typeOptionTextActive: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.primary,
  },

  // ==================================================
  // ADDRESS
  // ==================================================

  addressInput: {
    height: 82,
    paddingTop: 11,
    textAlignVertical:
      "top",
  },

  // ==================================================
  // STATUS
  // ==================================================

  statusSelector: {
    flexDirection:
      "row",
    gap: 8,
  },

  statusOption: {
    flex: 1,
    height: 44,
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
      COLORS.primaryLight,
    borderColor:
      COLORS.primary,
  },

  statusOptionText: {
    fontFamily:
      FONTS.medium,
    fontSize: 13,
    color:
      COLORS.textSecondary,
  },

  statusOptionTextActive: {
    fontFamily:
      FONTS.bold,
    color:
      COLORS.primary,
  },

  // ==================================================
  // MODAL ACTIONS
  // ==================================================

  modalActions: {
    flexDirection:
      "row",
    justifyContent:
      "flex-end",
    gap: 9,
    marginTop: 24,
  },

  cancelButton: {
    height: 44,
    paddingHorizontal: 18,
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
      FONTS.medium,
    fontSize: 14,
    color:
      COLORS.textSecondary,
  },

  modalActionButtonMobile: {
    width: "100%",
  },

  saveButton: {
    height: 44,
    minWidth: 125,
    paddingHorizontal: 18,
    borderRadius: 9,
    backgroundColor:
      COLORS.primary,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  saveLoadingContent: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: 9,
  },

  saveButtonText: {
    fontFamily:
      FONTS.medium,
    fontSize: 14,
    color: "#FFFFFF",
  },
});