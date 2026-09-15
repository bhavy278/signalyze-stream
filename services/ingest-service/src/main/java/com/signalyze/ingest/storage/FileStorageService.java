package com.signalyze.ingest.storage;

import org.bson.Document;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class FileStorageService {

    private final GridFsTemplate gridFs;

    public FileStorageService(GridFsTemplate gridFs) {
        this.gridFs = gridFs;
    }

    /** Stores the original uploaded file in GridFS, tagged with its job and owner. */
    public void store(String jobId, String userId, MultipartFile file) throws IOException {
        Document metadata = new Document();
        metadata.put("jobId", jobId);
        metadata.put("userId", userId);
        metadata.put("filename", file.getOriginalFilename());
        metadata.put("contentType", file.getContentType());

        String name = file.getOriginalFilename() != null ? file.getOriginalFilename() : jobId;
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        gridFs.store(file.getInputStream(), name, contentType, metadata);
    }
}
