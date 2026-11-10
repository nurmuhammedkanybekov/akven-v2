package com.akven.thesis.common;

import com.akven.thesis.support.IntegrationTest;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Anyone can ask which build is running, without signing in; without a commit it says "unknown", not nothing. */
class VersionControllerTest extends IntegrationTest {

    @Test
    void theRunningBuildIsPublic() throws Exception {
        mockMvc.perform(get("/api/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commit").value("unknown"))
                .andExpect(jsonPath("$.startedAt").isNotEmpty());
    }
}
