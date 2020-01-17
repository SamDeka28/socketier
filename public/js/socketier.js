let connected = false;
let Event_table = {
  emit: {},
  listen: {}
}
let socket = null;
let socketOptions = {};

let eventModalPayloadTemplate = `
    <tr>
      <td></td>
      <td><input name="key" type="text" class="form-control form-control-sm" /></td>
      <td><input name="value" type="text" class="form-control form-control-sm eventPayloadValue" /></td>
      <td>
        <select name="type" class="form-control form-control-sm">
          <option value="String">String</option>
          <option value="Number">Number</option>
          <option value="Object">Object</option>
        </select>
      <td>
        <button name="value" type="button" class="btn btn-danger removeEventModalPayloadField"><i class="fa fa-trash"></i></button></td>
      </td>
    </tr>
`

$(document).ready(function () {
  /**
   * Modal autofocus
   */
  $("#eventModal").on("shown.bs.modal", function () {
    $("#iEventName").trigger('focus');
  })
  $(document).on("change", "#eventType", function () {
    let eventType = $(this).val();
    if (eventType == "listen") {
      $(".listenerTable").hide();
      $(".payloadTable").hide();
      return;
    }
    $(".payloadTable").show();
    $(".listenerTable").show();
  });

  $(document).on("click", "#firesEvent", function () {
    let totalAddedListener = $(".addedListeners").children().length
    $(".addedListeners").append(`
    <div class="row mt-2" id="fireEvent${totalAddedListener}">
      <div class="col-md-3 col-sm-3 col-lg-4 col-4">
        <div class="input-group">
          <input class="listener form-control form-control-sm" name="listener" placeholder="Eg. MyEvent" />
          <div class="input-group-append">
            <button class="btn btn-sm btn-danger removeListener" data-id="fireEvent${totalAddedListener}"><strong><i class="fa fa-minus"/></strong></button>
          </div>
        </div>
      </div>
    </div>
    `);
  })

  /**
   * Remove listener
   */
  $(document).on("click", ".removeListener", function () {
    let id = $(this).attr("data-id");
    console.log({ id })
    $(document).find(`#${id}`).remove();
  })
  /**
   * Add new Payload field
   */
  $(document).on("click", "#eventModal .addPayloadField", function () {
    $(".payloadAppendable").append(`
      <tr>
        <td></td>
        <td><input name="key" type="text" class="form-control form-control-sm" /></td>
        <td><input name="value" type="text" class="form-control form-control-sm eventPayloadValue"/></td>
        <td>
            <select name="type" class="form-control form-control-sm">
              <option value="String">String</option>
              <option value="Number">Number</option>
              <option value="Object">Object</option>
            </select>
        <td>				
        <button name="value" type="button" class="btn btn-danger removeEventModalPayloadField"><i class="fa fa-trash"></i></button></td>
        </td>
      </tr>
    `)
  })

  /**
   * Add new Query field on Configuration Object
   */
  $(document).on("click", ".addConfigQuery", function () {
    $(".appendableQuery").append(`
        <tr>
          <td></td>
          <td><input name="key" type="text" class="form-control form-control-sm" /></td>
          <td><input name="value" type="text" class="form-control form-control-sm" /></td>
        </tr>
    `)
  });

  /**
   * Connect to the server
   */
  $(document).on("click", "#connect", function () {
    let host = $("#host").val();
    console.log(socketOptions)
    socket = io.connect(host,socketOptions);
    if (connected) {
      connected = false;
      socket.disconnect();
      $('.brandHeader').removeClass("brandHeader-connected").addClass("brandHeader-default");
      return $("#connect").removeClass("btn-success").removeClass("btn-danger").addClass("btn-primary");
    } else {
      socket.on("connect", () => {
        connected = true;
        $('.brandHeader').removeClass("brandHeader-default").addClass("brandHeader-connected");
        $("#connect").removeClass("btn-primary").removeClass("btn-danger").addClass("btn-success");
      });
    }
    socket.on("reconnect", () => {
      connected = true;
      $("#connect").removeClass("btn-danger").addClass("btn-success");
    })
    socket.on("disconnect", () => {
      connected = false
      $('.brandHeader').removeClass("brandHeader-connected").addClass("brandHeader-default");
      $("#connect").removeClass("btn-primary").addClass("btn-danger");
    })
    // socket.on("connect_error",(error)=>{
    // 	connected=false
    // 	$("#connect").removeClass("btn-primary").addClass("btn-danger");
    // })
  });
  /**Save config data */
  $(document).on("click", "#saveConfig", function () {
    let configs = $(".appendableQuery tr");
    let optionLength = $(".appendableQuery").children().length;
    let entries = [];
    for (let tr = 0; tr < optionLength; tr++) {
      let tdColumns = $(configs[tr]).children();
      let tdColumnLength = $(configs[tr]).children().length;
      let entry = []
      for (let td = 1; td < tdColumnLength; td++) {
        let value = $(tdColumns[td]).children().val();
        entry.push(value);
      }
      entries.push(entry);
    }
    socketOptions['query'] = Object.fromEntries(entries);
  });
  /**
   * Save Event Request Data
   */
  $(document).on("click", "#saveRequestData", function () {
    let event_name = $("#iEventName").val();
    let event_type = $("#eventType").val();
    let payloadTableRows = $(".payloadAppendable tr");
    let payloadTableRowLength = $(".payloadAppendable").children().length;
    let isGeneratedEmitName = false;
    let originalEmit = event_name;
    if (!event_name) {
      alert("Event name must be specified");
    }
    if (Event_table[event_type].hasOwnProperty(event_name)) {
      /**
       * Get same event count
       */
      isGeneratedEmitName = true;
      /**
       * If same event exist rename with the count 
       */
      event_name = recursiveNameGenerator(event_name, event_type);
    }

    Event_table[event_type][event_name] = {
      body: {}
    }
    if (payloadTableRowLength) {
      let entries = []
      for (let tr = 0; tr < payloadTableRowLength; tr++) {
        let entry = []
        let tdColumns = $(payloadTableRows[tr]).children();
        let tdColumnLength = $(payloadTableRows[tr]).children().length;
        for (let td = 1; td < tdColumnLength - 2; td++) {
          let value = $(tdColumns[td]).children().val();
          let type = null;
          if (td == 2) {
            type = $(tdColumns[td + 1]).find("select").val()
          }

          if (value) {
            if (type) {
              value = castPayloadField(type, value);
              console.log(typeof value)
            }
            entry.push(value);
          }
        }
        if (entry.length) {
          entries.push(entry);
        }
      }
      Event_table[event_type][event_name]['body'] = Object.fromEntries(entries);
    }

    /**
     * Make currently added event active
     */
    if (event_type == "emit") {
      $("#listenersTab").removeClass("active");
      $("#emitsTab").addClass("active");
    } else {
      $("#emitsTab").removeClass("active");
      $("#listenersTab").addClass("active");
    }

    $(`.${event_type}TabList .nav-item`).removeClass("active");
    $(`.${event_type}TabList .nav-item .nav-link`).removeClass("active");
    $(`.${event_type}Tabs div`).removeClass("active");
    /**
     * Add to tabList
     */
    $(`.${event_type}TabList`).append(`
      <li class="nav-item active">
        <a class="nav-link active" data-toggle="tab" href="#${event_name}">${event_name}</a>
      </li>
    `)
    /**
     * Create event content tab
     */
    $(`.${event_type}Tabs`).append(`
      <div id="${event_name}" class="container-fluid tab-pane active">
              <div class="row">
                <div class="col-md-12 col-lg-12 col-sm-12">
                  <div class="payloadOptions clearfix">
                      <ul class="nav nav-tabs optionTabList" role="tablist">
                      <li class="nav-item">
                      <a class="nav-link"><strong style="color: #fff;">PAYLOAD</strong><strong> ::</strong></a>
                      </li>
                        <li class="nav-item active">
                          <a class="nav-link active" data-toggle="tab" href="#${event_name}JSON">JSON</a>
                        </li>
                        <li class="nav-item">
                          <a class="nav-link" data-toggle="tab" href="#${event_name}Table">Table</a>
                        </li>
                      </ul>
                  </div>
                  <div class="tab-content">
                    <div id="${event_name}Table" class="container-fluid tab-pane">
                      <table class="table table-bordered table-sm mt-4">
                        <thead class="thead-dark">
                          <tr>
                            <th></th>
                            <th>Key</th>
                            <th>Value</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody class="${event_name}PayloadAppendableTable">
                        </tbody>
                      </table>
                    </div>
                    <pre class="${event_name}PayloadAppendableJSON ace-editor container-fluid tab-pane active" id="${event_name}JSON"></pre>
                  </div>
                </div>
                <div class="col-md-2 col-lg-2 col-sm-2">
                  <button type="button" class="${event_type}Event btn btn-success btn-sm" data-isGenerated="${isGeneratedEmitName}" data-originalEvent='${originalEmit}' data-eventId="${event_name}">${event_type.substring(0, 1).toUpperCase() + event_type.substring(1)} event</button>
                </div>
                <div class="col-md-12 col-sm-12 col-lg-12 mt-4">
                  <!--<h5 class="callback-header"><strong>Callback Response</strong></h5>-->
                  <h6 class="response"><strong>RESPONSE</strong></h6>
                  <pre class="appendResponse"></pre>
                  <div class="server-error-container server-error-container-hidden">
                    <h3 class="server-error">Could not get any response</h3>
                    <p class="server-error">There was an error connecting to .</p>
                    <h5 class="server-error"><strong>Why this might have happened:</strong></h5>
                    <ul class="server-error">
                      <li><strong>The server couldn't send a response:</strong>Ensure that the backend is working properly</li>
                      <li><strong>Request timeout</strong>: Change request timeout in Configure Options</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
      `)

    /**
     * Add payload if any
     */
    let body = Event_table[event_type][event_name]['body']
    let bodyCount = Object.keys(body).length
    if (bodyCount) {
      /**
       * Initialize ace editor
       */
      let editor = ace.edit(`${event_name}JSON`);
      editor.setTheme("ace/theme/twilight");
      editor.setFontSize(14);
      let jsonMode = ace.require("ace/mode/json").Mode;
      editor.session.setMode(new jsonMode());
      editor.setValue(JSON.stringify(body, null, "\t"), 1);
      // $(`#${event_name} .${event_name}PayloadAppendableJSON`).jsonViewer(body,{collapsed:true,rootCollapsable:false});
      $(`#${event_name} .${event_name}PayloadAppendableTable`).html(``)
      for (let key in body) {
        let value = body[key]
        $(`#${event_name} .${event_name}PayloadAppendableTable`).append(`
          <tr id='${event_name}PayloadAppendable${key}'>
            <td></td>
            <td><input name="key" type="text" class="form-control form-control-sm keyField" value="${key}"/></td>
            <td><input name="value" type="text" class="form-control form-control-sm" value="${value}"/></td>
            <td class="text-center">
              <div class="btn-group">
                <button name="value" type="button" data-fieldKey='${key}' data-event="${event_name}"  data-fieldName="${event_name}PayloadAppendable${key}" data-eventType="${event_type}" class="btn btn-danger removePayloadField"><i class="fa fa-trash"></i></button></td>
            </div>
          </tr>`)
      }
    }

    /**
     * Reset modal
     */
    $("#eventModal .payloadAppendable").html(eventModalPayloadTemplate);
  });

  /**
   * Recursive name generator
   */
  function recursiveNameGenerator(event_name, event_type, count = 0) {
    if (Event_table[event_type].hasOwnProperty(event_name)) {
      count += 1;
      event_name = `${event_name}_${count}`
      return recursiveNameGenerator(event_name, event_type, count);
    }
    return event_name;
  }
  /**
   * Cast payloadFieldValue
   */
  function castPayloadField(type, value) {
    switch (type) {
      case "String":
        return String(value);
      case "Number":
        return Number(value);
      case "Object":
        return JSON.parse(value);
    }
  }

  /**
   * On click of emit tab, get list of events and generate dynamic tabs of events
   */
  $(document).on("click", ".emitEvent", function () {
    let event_name = $(this).attr("data-eventId");
    let isGenerated = $(this).attr("data-isGenerated");
    let original_event_name = event_name;
    if (isGenerated) {
      original_event_name = $(this).attr("data-originalEvent");
    }
    let eventBody = Event_table['emit'][event_name]['body'];
    if (event_name) {
      socket.emit(original_event_name, eventBody, (data) => {
        if (data) {
          $(`#${event_name} .appendResponse`).jsonViewer(data, { collapsed: true, rootCollapsable: false })
        }
      })
    }
  });

  /**`
   * Attach listener to socket io instance
   */
  $(document).on("click", ".listenEvent", function () {
    let event_name = $(this).attr("data-eventId");
    if (event_name) {
      socket.on(event_name, (data) => {
        if (data) {
          $(`#${event_name} .appendResponse`).jsonViewer(data, { collapsed: true, rootCollapsable: true })
        }
      })
    }
  });

  /**
   * Remove payload field from added payload
   */
  $(document).on("click", `.removePayloadField`, function () {
    let payloadField = $(this).attr("data-fieldName");
    let event = $(this).attr("data-event");
    let event_type = $(this).attr("data-eventType");
    let keyName = $(this).attr("data-fieldKey");
    /**
     * remove table row
     */
    console.log({ payloadField })
    $(`#${payloadField}`).remove();
    /**
     * Delete data from event body
     */
    console.table(Event_table[event_type][event]['body'])
    delete Event_table[event_type][event]['body'][keyName];
    console.table(Event_table[event_type][event]['body'])

  });

  $(document).on("click", ".removeEventModalPayloadField", function () {
    $(this).parent("tr").remove();
  })
})