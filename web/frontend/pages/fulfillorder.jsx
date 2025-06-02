import React, { useState, useEffect } from "react";
import {
  Card,
  Page,
  Layout,
  Text,
  Button,
  Stack,
  Banner,
  DropZone,
  HorizontalGrid,
  Box,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";

export default function FulfillOrder() {
  const { t } = useTranslation();
  const shopify = useAppBridge();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDropZoneDrop = (_dropFiles, acceptedFiles) => {
    setFile(acceptedFiles[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/orders/bulk-fulfill", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Bulk fulfillment failed");
      }

      setResult(data.summary);
      shopify.toast.show(t("BulkFulfillmentCard.successToast"));
    } catch (err) {
      setError(err.message);
      shopify.toast.show(err.message, { isError: true });
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        Name: "#1025",
        TrackingNumber: "RX123456789IN",
        TrackingCompany: "India Post",
        TrackingUrl: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sample");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sample_bulk_fulfillment.xlsx";
    link.click();
  };

  const renderImportSummary = () => {
    if (!result) return null;

    const total = result.length;
    const success = result.filter((r) => !r.error).length;
    const failed = total - success;
    const status = failed > 0 ? "Completed with errors" : "Import complete";

    return (
      <Layout.Section>
        <Card title="Import Summary">
          <Box padding="4">
            <HorizontalGrid
              columns={{
                xs: 1,
                sm: 6,
              }}
              gap="4"
              alignItems="center"
              paddingBlockStart="200"
              paddingBlockEnd="200"
              borderColor="border"
              borderRadius="base"
              background="bg-surface"
            >
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Date
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Import source
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Total Upload
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Successful
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Failed
              </Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                Status
              </Text>

              <Text as="span">{new Date().toLocaleDateString("en-GB")}</Text>
              <Text as="span">Epic Fulfill</Text>
              <Text as="span">{total}</Text>
              <Text as="span">{success}</Text>
              <Text as="span">{failed}</Text>
              <Text as="span">{status}</Text>
            </HorizontalGrid>
          </Box>
        </Card>
      </Layout.Section>
    );
  };

  // Fetch saved summary from server when component mounts
  useEffect(() => {
    const fetchSavedSummary = async () => {
      try {
        const res = await fetch("/api/orders/fulfillment-report");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.report?.length > 0) {
          setResult(data.report);
        }
      } catch (err) {
        console.error("No previous report found or fetch failed.");
      }
    };

    fetchSavedSummary();
  }, []);

  return (
    <Page fullWidth>
      <TitleBar title="Epic Fulfill: Bulk Orders" />

      <Layout>
        <Layout.Section>
          <Card
            title="Bulk Fulfill Orders via Excel"
            sectioned
            primaryFooterAction={{
              content: uploading ? "Uploading..." : "Upload and Fulfill Orders",
              onAction: handleUpload,
              loading: uploading,
              disabled: !file || uploading,
            }}
            secondaryFooterActions={[
              {
                content: "Download Sample Excel",
                onAction: handleDownloadSample,
              },
            ]}
          >
            <DropZone
              accept=".xlsx, .xls, .csv"
              type="file"
              onDrop={handleDropZoneDrop}
            >
              <DropZone.FileUpload />
              {file && (
                <Stack vertical spacing="tight" alignment="center">
                  <Text variant="bodyMd" fontWeight="medium">
                    {file.name}
                  </Text>
                </Stack>
              )}
            </DropZone>

            {error && (
              <Banner
                title="Upload failed"
                status="critical"
                onDismiss={() => setError(null)}
              >
                <p>{error}</p>
              </Banner>
            )}
          </Card>
        </Layout.Section>

        {renderImportSummary()}
      </Layout>
    </Page>
  );
}
