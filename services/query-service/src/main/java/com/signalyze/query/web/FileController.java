package com.signalyze.query.web;

import com.mongodb.client.gridfs.model.GridFSFile;
import com.signalyze.query.security.CurrentUser;
import org.springframework.core.io.InputStreamResource;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsResource;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/documents")
public class FileController {

    private final GridFsTemplate gridFs;

    public FileController(GridFsTemplate gridFs) {
        this.gridFs = gridFs;
    }

    @GetMapping("/{jobId}/file")
    public ResponseEntity<?> file(@PathVariable String jobId) throws IOException {
        String userId = CurrentUser.id();
        GridFSFile f = gridFs.findOne(Query.query(Criteria.where("metadata.jobId").is(jobId)));
        if (f == null || f.getMetadata() == null) {
            return ResponseEntity.notFound().build();
        }
        String owner = f.getMetadata().getString("userId");
        if (userId == null || !userId.equals(owner)) {
            return ResponseEntity.notFound().build();
        }
        String contentType = f.getMetadata().getString("contentType");
        GridFsResource resource = gridFs.getResource(f);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        contentType != null ? contentType : "application/octet-stream"))
                .body(new InputStreamResource(resource.getInputStream()));
    }
}
