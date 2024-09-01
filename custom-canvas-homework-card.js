import { LitElement, html } from "https://cdn.jsdelivr.net/npm/lit-element@4.1.0/lit-element.min.js";
import { classMap } from "https://cdn.jsdelivr.net/npm/lit-html@3.2.0/lit-html.min.js";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/dangerous-html@0.1.13/dist/react/lib.min.js";
import { ReactiveElement } from "https://cdn.jsdelivr.net/npm/@lit/reactive-element@2.0.4/css-tag.min.js";

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'canvas-homework',
  name: 'Canvas - Homework Card',
  preview: false,
  description: 'A card used to display Canvas Homework.',
});

class CanvasStudent extends LitElement {
  // Whenever the state changes, a new `hass` object is set. Use this to
  // update your content.
  set hass(hass) {
    // Initialize the content if it's not there yet.
    this._hass = hass;

    this.students = new Array();
    this.courses = new Array();
    this.assignments = new Array();
    this.courseAssignments = new Array();
    this.date = new Date();

    if(Array.isArray(this.config.entities))
    {
      var configStudents = this.config.entities.find(a => a.entity == "sensor.canvas_students")
      var configCourses = this.config.entities.find(a => a.entity == "sensor.canvas_courses")
      var configAssignments = this.config.entities.find(a => a.entity == "sensor.canvas_assignments")
      var configSubmissions = this.config.entities.find(a => a.entity == "sensor.canvas_submissions")
      
      var eStudents = configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
      var eCourses = configCourses.entity in this._hass.states ? this._hass.states[configCourses.entity] : null
      var eAssignments = configAssignments.entity in this._hass.states ? this._hass.states[configAssignments.entity] : null
      var eSubmissions = configSubmissions.entity in this._hass.states ? this._hass.states[configSubmissions.entity] : null

      eAssignments.attributes.assignment.forEach(assignment => {
        if ((!assignment.has_submitted_submissions || eSubmissions.attributes.submission.some(s => s.assignment_id == assignment.id && s.workflow_state == "unsubmitted")) && assignment.due_at) {
          assignment.missing = eSubmissions.attributes.submission.some(s => s.assignment_id == assignment.id && s.workflow_state == "unsubmitted" &&s.missing ) ? true : false
          this.courseAssignments.push(assignment.course_id)
          this.assignments.push(assignment)
        }
      })

      eCourses.attributes.course.forEach(course => {
        if (!this.courses.some(c => c.name == course.name) && this.courseAssignments.some(ca => ca == course.id) && (Date.parse(course.term.start_at) <= this.date && Date.parse(course.term.end_at) >= this.date)) {
          this.courses.push(course)
        }
      })
      
      eStudents.attributes.student.forEach(student => {
        this.students.push(student)
      })
    }
  }

  constructor(){
    super();
    this.addEventListener('canvas-check-homework', e => {
      console.log(e)
      const modal = this.shadowRoot.querySelector('canvas-assignment-dialog');
      modal.open = true;
      modal.title = e.detail.course.name;
      modal.assignmentname = e.detail.assignment.name;
      modal.totalpoints = e.detail.assignment.points_possible;
      modal.comments = e.detail.assignment.description;
      modal.assigneddate = e.detail.assignment.created_at;
      modal.duedate = e.detail.assignment.due_at;
      modal.missing = e.detail.assignment.missing == true ? e.detail.assignment.missing : false;
      modal.date = new Date().toLocaleDateString('en-CA');
    })
  }

  render(){
    return html
    `
    ${this._renderStyle()}
    ${html
      `
      <ha-card header="Canvas - Homework">
        <div class="card-content">
        ${this.students.map(student => 
          html
          `
            <div class="info flex">
              <div>
              <span class="student_name"><ha-icon icon="mdi:account-school"></ha-icon> ${student.name} (${student.id})</span>
              <div class="secondary">
                ${this.courses.map(course =>
                  html
                  `
                  ${course.enrollments[0].user_id == student.id ? html
                    `
                    <span>${course.name}</span>
                    <mwc-list class="mdc-list--dense">
                    ${this.assignments.map(assignment =>
                      html
                      `
                      ${assignment.course_id == course.id ? html
                        `
                        <mwc-list-item class="mwc-compact" hasmeta @click="${() => this._handleClick(assignment,course)}">
                          ${new Date(Date.parse(assignment.due_at)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })} - ${assignment.name.substring(0,50)} ${assignment.missing ? html`<span slot='meta'><ha-icon icon='mdi:calendar-alert' class='missing'></ha-icon></span>`:""}
                          ${new Date(Date.parse(assignment.due_at)).toLocaleDateString('en-CA') <= this.date.toLocaleDateString('en-CA') && !assignment.missing ? html`<span slot='meta'><ha-icon icon='mdi:calendar-alert' style='color:#F1D019'></ha-icon></span>` : ""}
                        </mwc-list-item>
                        `
                      :""}
                      `
                      )}
                    `
                  : ""}
                  </mwc-list>
                  `
                  )}
                </div>
              </div>
            </div>
          `
        )}
        <canvas-assignment-dialog></canvas-assignment-dialog>
        </div>
      </ha-card>
      `
      }
    `
  }

  _renderStyle() {
    return html
    `
    <style>
    .info {
      padding-bottom: 1em;
    }
    .flex {
      display: flex;
      justify-content: space-between;
    }
    .secondary {
      display: block;
      color: #3D95EC;
      margin-left: 28px;
    }
    .missing {
      color: #a3262c;
    }
    .mwc-compact{
      height: 24px !important
    }
  </style>
    `;
  }

  // The user supplied configuration. Throw an exception and Home Assistant
  // will render an error card.
  setConfig(config) {
    if (!config.entities) {
      throw new Error('You need to define entities');
    }
    this.config = config;
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("content-card-editor");
  }

  static getStubConfig() {
    return { 
      entities: [
        {entity:'sensor.canvas_students'},
        {entity:'sensor.canvas_courses'},
        {entity:'sensor.canvas_assignments'},
        {entity:'sensor.canvas_submissions'}
      ] 
    }
  }


  _handleClick(assignment,course) {
    this.dispatchEvent(new CustomEvent('canvas-check-homework', {detail: {assignment,course}}));
  }

}

class AssignmentDialog extends LitElement{
  static get properties() {
    return {
      open: { type: Boolean },
      title: { type: String },
      text: { type: String },
      clickAction: { type: String }
    };
  }

  constructor() {
    super();
    this.open = false;
  }

  _renderStyle() {
    return html
    `
    <style>
      :host {
        font-family: Arial, Helvetica, sans-serif;
      }
      .wrapper {
        opacity: 0;
        position: absolute;
        z-index: 10;
        transition: opacity 0.25s ease-in;
      }
      .wrapper:not(.open) {
        visibility: hidden;
      }
      .wrapper.open {
        align-items: center;
        display: flex;
        justify-content: center;
        height: 100vh;
        position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        opacity: 1;
        visibility: visible;
      }
      .overlay {
        background: rgba(0, 0, 0, 0.8);
        height: 100%;
        width: 100%;
        position: relative;
      }
      .dialog {
        background: var( --ha-card-background, var(--card-background-color, white) );
        border-radius: 2px;
        max-width: 600px;
        padding: 1rem;
        position: absolute;
      }
      .dialog h1 {
        margin: 0 0 10px;
      }
      .dialog button {
        background-color: #3D95EC;
        color: white;
        width: 100%;
        font-size: 16px;
        padding: 15px 32px;
        border: none;
        border-radius: 10px;
        text-decoration: none;
        display: inline-block;
        margin-top: 10px;
      }
      .space-between {
        display: flex;
        justify-content: space-between;
      }
      .assignment-style {
        color: #3D95EC;
      }
      .assignment-due {
        color: #F1D019
      }
    </style>
    `;
  }

  render() {
    return html`
      ${this._renderStyle()}
      <div class="${classMap({wrapper: true, open: this.open})}">
        <div class="overlay" @click="${this.close}"></div>
        <div class="dialog">
          <h1 id="title">${this.title}</h1>
          <div id="content" class="content">
            <mwc-list class="mdc-list--dense">
              <mwc-list-item>${this.assignmentname}</mwc-list-item>
              ${this.missing ? html`<mwc-list-item style='color:#a3262c;'><ha-icon icon='mdi:alert-box'></ha-icon>&ensp;MISSING</mwc-list-item>` : ""}
              <mwc-list-item><ha-icon icon="mdi:counter"></ha-icon><span class="assignment-style">&ensp;Points: </span>${this.totalpoints}</mwc-list-item>
              <mwc-list-item><ha-icon icon="mdi:calendar"></ha-icon><span class="assignment-style">&ensp;Assigned On: </span>${new Date(Date.parse(this.assigneddate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <mwc-list-item>${new Date(Date.parse(this.duedate)).toLocaleDateString('en-CA') <= this.date ? html`<ha-icon icon='mdi:calendar-alert' class='assignment-due'></ha-icon>` : html`<ha-icon icon='mdi:calendar-alert' ></ha-icon>`}<span class="assignment-style">&ensp;Due On: </span>${new Date(Date.parse(this.duedate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <!--<mwc-list-item><ha-icon icon="mdi:comment-text"></ha-icon><span class="assignment-style">&ensp;Comments: </span>${unsafeHTML(this.comments)}</mwc-list-item>-->
            </mwc-list>
            ${this.comments ? html `
              <div id="canvas-comments">
                <h2>Description</h2>
              ${unsafeHTML(this.comments)}
            </div>
            ` : ""}
          </div>
          <button @click=${this.handleClick}>${this.clickAction}Close</button>
        </div>
      </div>
    `;
  }

  close() {
    this.open = false;
  }

  handleClick() {
    this.dispatchEvent(new CustomEvent('button-click'));
    this.close();
  }
}

customElements.define('canvas-assignment-dialog', AssignmentDialog);
customElements.define('canvas-homework', CanvasStudent);
